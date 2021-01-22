import { ICampus } from '../models/Campus.model';
import CampusModel from 'src/models/Campus.model';
import * as IORedis from 'ioredis';
import { logger } from '@shared';

export class Campus {
    constructor() {

    }

    // public static async create(campusObject: ICampus) {
    //     const campus = await new CampusModel({
    //         name: campusObject.name,
    //         abbreviation: campusObject.abbreviation,
    //         // members
    //     });
    //
    //     await campus.save();
    //
    //     return 0;
    // }

    public static async GetList(client: IORedis.Redis) {
        // TODO: Create a way to rank campuses
        const campuses = await client.smembers('campuses');
        return { campuses };
    }

    public static async GetPosts(client: IORedis.Redis, campus: string) {
        const posts = await client.hgetall(campus);
        // TODO: Sort posts by a score
        return { posts };
    }

    public static async GetCampusTrend(client: IORedis.Redis, campus: string) {
        try {
            const trendingKeywords = await client.zrevrange(`campusesTrends:${campus}`, 0, -1);
            return { trendingKeywords };
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async GetCampusesAndTrends(client: IORedis.Redis) {
        try {
            const campuses = await (await client.keys('campusesTrends:*'))
                .map(item => item.split(':')[1]);
            return campuses;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
}
