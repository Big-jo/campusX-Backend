import { ICircle } from '../../interfaces/ICircle';
import CircleModel from '../../models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from '../../models/CircleMember.model';
import IORedis from 'ioredis';

export class Circle {
    // constructor() {}

    public static async Create(circleObject: ICircle) {
        try {
            const circleName = circleObject.name.toLowerCase();
            const circle = await CircleModel.findOne({name: circleName}).exec();
            if (circle) {
            return {exist: true};
        } else {
            const newCircle = new CircleModel({
                name: circleObject.name,
                avatar: circleObject.avatar,
                description: circleObject.description,
            });
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
            const member = await CircleMemberModel.findOne({userID}).exec();
            if (member) {
                return {exist: true};
            } else {
                const newMember = new CircleMemberModel({
                    userID,
                    circle: circleID,
                });
                const saved = await newMember.save();
                return {memberID: saved.id};
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Leave(circleID: string, userID: string) {
        try {
            await CircleMemberModel.findOneAndDelete({circle: circleID, userID}).exec();
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
            return {circleFeed};

            // Write Sort Algorithm for Posts 😢 
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    public static async GetCircles() {
        try {
            const circles = await CircleModel.find().exec();
            return {circles};
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }
}
