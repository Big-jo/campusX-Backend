import { ICampus } from '../models/Campus.model';
import CampusModel from 'src/models/Campus.model';
import * as IORedis from 'ioredis';

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
        return {campuses};
    }

    public static async GetPosts(client: IORedis.Redis, campus: string) {
        const posts = await client.hgetall(campus);
        // TODO: Sort posts by a score
        return {posts};
    }
}
