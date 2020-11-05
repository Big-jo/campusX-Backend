import { ICircle } from '../../interfaces/ICircle';
import CircleModel from '../../models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from '../../models/CircleMember.model';
import IORedis from 'ioredis';
import {S3} from '@lib';
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

                // const s3 = new S3(newCircle.id, circleObject.avatar, 'circle-avatars');
                // newCircle.avatar = await s3.UploadCircleAvatar() as string;
                await newCircle.save();

                // Add the user to that circle
                this.Join(userID, newCircle.id);
                return 0;
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
                return {error: 'Not a member of this circle'};
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async GetCircleFeed(circleID: string, redisClient: IORedis.Redis) {
        try {
            const circlePostKeys = await redisClient.smembers(`circlePostsIndexes:${circleID}`);
            if (circlePostKeys.length !== 0) {
                const pipeline = redisClient.pipeline();

                for (let index = 0; index < circlePostKeys.length; index++) {
                    const key = circlePostKeys[index];
                    pipeline.hgetall(key.split(':')[1]);
                }

                const pipelineResult = await pipeline.exec();

                // const circleFeed = piplelineResult.map(item => item[1]);
                const filtered: any = [];

                for (let i = 0; i < pipelineResult.length; i++) {
                    const currentItem = pipelineResult[i][1];
                    const nextItem = pipelineResult[i === pipelineResult.length - 1 ? 0 : i + 1][1];

                    if (Object.entries(currentItem).length !== 0) {
                        filtered.push(currentItem);
                        // nextItem !== 0 ? filtered.push([currentItem, { isliked: true }]) : filtered.push([currentItem, { isliked: false }]);
                    }
                    // nextItem === 1 ? filtered.push([currentItem, {isliked: true}]) : filtered.push([currentItem, {isliked: false}]);
                }

                return { circleFeed: filtered };
            } else {
                return { circleFeed: [] };
            }

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
