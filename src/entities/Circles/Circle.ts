import { ICircle } from '../../interfaces/ICircle';
import CircleModel from '../../models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from '../../models/CircleMember.model';
import IORedis from 'ioredis';
import { S3, Utility } from '@lib';
import { Types } from 'mongoose';
import PostModel from '../../models/Post.model';
import CirclePostModel from '../../models/CirclePost.model';
import moment from 'moment';
// import { circleFeed } from 'src/routes/circles/Circles.route';
// import mongoose from 'mongoose';

export class Circle {

    public static async Create(circleObject: ICircle, userID: string) {
        try {
            const circleName = circleObject.name.toLowerCase();
            const circle = await CircleModel.findOne({ name: circleName }).lean().exec();
            if (circle !== null) {
                return { exist: true };
            } else {
                const newCircle = new CircleModel({
                    name: circleName,
                    description: circleObject.description,
                    moderators: [{ moderator: userID }],
                    category: circleObject.category.toLowerCase(),
                });

                if ((circleObject.avatar !== undefined) && (circleObject.coverImage !== undefined)) {
                    const s3Avatar = new S3(`avatar:${newCircle.id}`, circleObject.avatar, 'circle-avatars');
                    const s3CoverImage = new S3(`coverImage:${newCircle.id}`, circleObject.coverImage, 'circle-cover-image');

                    newCircle.avatar = await s3Avatar.UploadCircleAvatar() as string;
                    newCircle.coverImage = await s3CoverImage.UploadCircleCoverImage() as string;
                }

                await newCircle.save();

                // Add the user to that circle
                this.Join(userID, newCircle.id);

                return {exist: false};
            }

        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }

    }

    public static async Join(userID: string, circleID: string) {
        try {
            const member = await CircleMemberModel.findOne({ userID, circle: circleID }).lean().exec();
            if (member) {
                return { exist: true };
            } else {
                const newMember = new CircleMemberModel({
                    userID,
                    circle: circleID,
                });
                const saved = await newMember.save();
                CircleModel.findByIdAndUpdate({ _id: circleID }, { $inc: { members_count: 1 } }).exec();
                return { memberID: saved.id };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Leave(circleID: string, userID: string) {
        try {

            const isMember = await CircleMemberModel.findOne({ userID, circle: circleID }).exec();
            if (isMember !== null) {
                CircleMemberModel.findOneAndDelete({ circle: circleID, userID }).exec();
                CircleModel.findByIdAndUpdate({ _id: circleID }, { $inc: { members_count: -1 } }).exec();
            } else {
                return { error: 'Not a member of this circle' };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async GetCircleFeed(circleID: string, userID: string, page: number, limit: number) {
        try {
            const query = [
                {
                    $match: {circleID: Types.ObjectId(circleID)},
                },
                {
                    $addFields: {
                        isLiked: { $in: [userID, '$likedBy'] },
                    },
                },
                {
                    $project: {
                        likedBy: 0,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        let: { authorID: '$author' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$authorID'] } } },
                            { $project: { password: 0, email: 0 } },
                        ],
                        as: 'author',
                    },
                },
                {
                    $sort: {
                        likes: -1,
                    },
                },
            ];

            const options = {
                page,
                limit,
            };
            const aggregate = CirclePostModel.aggregate(query);

            // @ts-ignore
            const circleFeed = await CirclePostModel.aggregatePaginate(aggregate, options);

            return {circleFeed: circleFeed.docs};
            // Write Sort Algorithm for Posts 😢 
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircles(offset: number, userID: string, recent: boolean, redis: IORedis.Redis, category?: string) {
        try {
            let circles;

            if (recent) {
                const recentCircles = await redis.zrevrange(`visitedCircles:${userID}`, 0, 10);
                circles = await CircleModel.find({_id: {$in: recentCircles}}).exec();
                return {circles};
            }

            if (category !== undefined) {
                [circles] = await Promise.all([CircleModel.paginate({category: category.toLowerCase()},
                    { offset, limit: 15, sort: { members_count: -1 } })]);
            } else {
                 [circles] = await Promise.all([CircleModel.paginate({}, { offset, limit: 15, sort: { members_count: -1 } })]);
            }

            return { circles: circles.docs };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircle(circleId: string, userID: string, redis: IORedis.Redis) {
        try {
            const memberID = await CircleMemberModel.find({ userID, circle: circleId }).lean().exec();

            // Record that this user has visited this circle in their activity feed
            const lastVisit = moment().valueOf().toString();
            redis.zadd(`visitedCircles:${userID}`, lastVisit, circleId);

            // Set up expiry for visited circles
            const VisitedCirclesExpiryTime = parseInt(process.env.VISITED_CIRCLE_EXP_TIME, 10);
            const VisitedCirclesExpiryUnit = process.env.VISITED_CIRCLE_EXP_UNI as any;
            Utility.CacheExpiryTracker('VistedCirclesExpiry', `${userID}:${circleId}`, VisitedCirclesExpiryTime, VisitedCirclesExpiryUnit, redis);

            const circle = await CircleModel.findById(circleId).lean().exec();
            return { circle, memberID: memberID !== undefined ? memberID : null };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async UserCircles(userID: string) {
        try {

            const circles = await CircleMemberModel.find({ userID }).lean()
                .populate({ path: 'circle' }).exec();
            return { circles };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }
}
