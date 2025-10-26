import { ICampus } from '../models/Campus.model';
import CampusModel from 'src/models/Campus.model';
import * as IORedis from 'ioredis';
import { logger } from '@shared';
import {AggregationQueries} from '@lib';
import mongoose from 'mongoose';

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

    /**
     *  Gets list of campuses that have timelines'
     * @param client
     * @constructor
     */
    public static async GetList(client: IORedis.Redis) {
        // TODO: Create a way to rank campuses
        const campuses = await client.zrange('campuses', 0, -1);
        return { campuses };
    }

    /**
     *  Get posts from a campus
     * @param client
     * @param campus
     * @param userID
     * @constructor
     */
    public static async GetPosts(client: IORedis.Redis, campus: string, userID: string) {
        // TODO: Sort campus based on the amount of activity happening in it

        const posts = await client.zrange(`campusFeed:${campus}`, 0 , -1);
        const converted = posts.map(postID =>  mongoose.Types.ObjectId((postID.split(':')[1])));
        
        const aggregatedPosts = await AggregationQueries.NewsfeedPostAggreg(userID, converted);
        // TODO: Sort posts by a score
        return { posts: aggregatedPosts };
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
