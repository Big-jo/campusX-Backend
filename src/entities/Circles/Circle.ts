import { ICircle } from '../../interfaces/ICircle';
import CircleModel from '../../models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from '../../models/CircleMember.model';
import IORedis from 'ioredis';
import { S3 } from '@lib';
import { Types } from 'mongoose';
import PostModel from '../../models/Post.model';
import CirclePostModel from '../../models/CirclePost.model';
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
                    avatar: ' ',
                    description: circleObject.description,
                    moderators: [{ moderator: userID }],
                });

                const s3 = new S3(newCircle.id, circleObject.avatar, 'circle-avatars');
                newCircle.avatar = await s3.UploadCircleAvatar() as string;
                await newCircle.save();

                // Add the user to that circle
                this.Join(userID, newCircle.id);
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
                    $match: { circle: Types.ObjectId(circleID) },
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
            const circleFeed = CirclePostModel.aggregatePaginate(aggregate, options);

            return { circleFeed };
            // Write Sort Algorithm for Posts 😢 
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircles(offset: number) {
        try {
            const [circles] = await Promise.all([CircleModel.paginate({}, { offset, limit: 15, sort: { members_count: -1 } })]);

            return { circles: circles.docs };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircle(circleId: string, userID: string) {
        try {
            const memberID = await CircleMemberModel.find({ userID, circle: circleId }).lean().exec();
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
