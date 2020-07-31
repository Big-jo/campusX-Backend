import { ICircle } from '../../interfaces/ICircle';
import CircleModel from '../../models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from '../../models/CircleMember.model';
import IORedis from 'ioredis';
import { S3 } from '../../lib/s3';
// import mongoose from 'mongoose';

export class Circle {
    // private ObjectId = mongoose.Types.ObjectId; 

    // constructor() {

    // }

    public static async Create(circleObject: ICircle) {
        try {
            const circleName = circleObject.name.toLowerCase();
            const circle = await CircleModel.findOne({ name: circleName }).exec();
            if (circle) {
                return { exist: true };
            } else {
                const newCircle = new CircleModel({
                    name: circleObject.name,
                    avatar: ' ',
                    description: circleObject.description,
                });

                const s3 = new S3(newCircle.id, circleObject.avatar, 'circle-avatars');
                newCircle.avatar = await s3.UploadCircleAvatar() as string;

                await newCircle.save();
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
                return { memberID: saved.id };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Leave(circleID: string, userID: string) {
        try {
            await CircleMemberModel.findOneAndDelete({ circle: circleID, userID }).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async GetCircleFeed(circleID: string, redisClient: IORedis.Redis) {
        try {
            const circleFeed = [];
            const cachedPosts = await redisClient.hgetall(circleID);
            circleFeed.push(cachedPosts);
            return { circleFeed };

            // Write Sort Algorithm for Posts 😢 
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircles(offset: number) {
        try {
            const [circles] = await Promise.all([CircleModel.paginate({}, { offset, limit: 10 })]);

            return { circles: circles.docs };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircle(circleId: string, userID: string) {
        try {
            const memberID = await CircleMemberModel.find({userID, circle: circleId}).lean().exec();
            const circle = await CircleModel.findById(circleId).lean().exec();
            return { circle, memberID: memberID !== undefined ? memberID : null};
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async UserCircles(userID: string) {
        try {

            const circles = await CircleMemberModel.find({ userID }).lean()
                .populate({path: 'circle'}).exec();
            return { circles };
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }
}
