import { Types } from 'mongoose';
import PostModel from '../models/Post.model';

export class AggregationQueries {

    /**
     * 
     * @param userID 
     * @param postIDs
     */
    public static async NewsfeedPostAggreg(userID: string, postIDs: Types.ObjectId[]) {

        const aggregate = [
            {
                $match: { _id: { $in: postIDs } },
            },
            {
                $addFields: {
                    isLiked: { $in: [Types.ObjectId(userID), '$likedBy'] },
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
            }, {
                $sort: { createdAt: -1 }
            }
        ];

        return (await PostModel.aggregate(aggregate).exec());
    }

    public static async GetUserPostsAggreg(userID: string, options: { page: number, limit: number }) {
        const aggregate = [
            {
                $match: { author: Types.ObjectId(userID) },
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
        ];

        const agg = PostModel.aggregate(aggregate);
        //@ts-ignore
        return (await PostModel.aggregatePaginate(agg, options));
    }

    public static async GetPost(postID: string) {

        const aggregate = [
            {
                $match: { _id: postID },
            },
            {
                $addFields: {
                    isLiked: { $in: [postID, '$likedBy'] },
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
            }
        ];

        return (await PostModel.aggregate(aggregate).exec());
    }

    public static async GetRecentPosts(userID: string) {

        const aggregate = [
            {
                $match: { author: userID },

            },
            {
                $project: {
                    likedBy: 0,
                },
            },
            {
                $gt: new Date().getTime() - (60 * 60 * 1000)
            }
        ]
    }
}