import { Types } from 'mongoose';
import PostModel from '../models/Post.model';
import CirclePostModel from '../models/CirclePost.model';

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
            },
            {
                $lookup: {from: 'comments',
                let: {
                  parentPost: "$_id"
                },
                pipeline: [
                  {
                  "$match": {
                    $expr: {
                      $eq: ["$parentPost", "$$parentPost"]}
                  },
                  },
                  {
                    $addFields: {
                      score: {$add: [{$multiply: [2, "$likes"]}, {$multiply: [4.7, "$comments"]}]}
                    }
                  },{
                    $sort: {
                      score: -1
                    }
                  },{
                    $limit: 4
                  }
                ],
                as: 'top_comments'
              }}
            ,
             {
                $sort: { createdAt: -1 }
            }
        ];

        return (await PostModel.aggregate(aggregate).exec());
    }

    public static async GetUserPostsAggreg(userID: string, postType: string, options: { page: number , limit: number } = {page: 1, limit: 50}) {

        const query: any = 
        { 
            author: Types.ObjectId(userID)
        }

        if (postType === 'video') {
            query['video'] = {$ne: null}
            query['image'] = {$eq: null}

        }

        if (postType === 'text') {
            query['text'] = {$ne: ""}
            query['video'] = {$eq: null}
            query['image'] = {$eq: null}
        }

        if (postType === 'image') {
            query['image'] = {$ne: null}
            query['video'] = {$eq: null}

        }

        const aggregate = [
            {
                $match: query,
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
            },
            {
               $lookup: {from: 'comments',
                let: {
                  parentPost: "$_id"
                },
                pipeline: [
                  {
                  "$match": {
                    $expr: {
                      $eq: ["$parentPost", "$$parentPost"]}
                  },
                  },
                  {
                    $addFields: {
                      score: {$add: [{$multiply: [2, "$likes"]}, {$multiply: [4.7, "$comments"]}]}
                    }
                  },{
                    $sort: {
                      score: -1
                    }
                  },{
                    $limit: 4
                  }
                ],
                as: 'top_comments'
            }}
        ];

        const agg = await PostModel.aggregate(aggregate).exec();
        return agg;
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

    public static async CirclePostsAggreg(userID: string, postIDs: Types.ObjectId[]) {
        const query = [
            {
                $match: {_id: {$in: postIDs}},
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
            },
            {
                $lookup: {
                    from: 'circles',
                    let: { circleID: '$circleID' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$circleID'] } } },
                    ],
                    as: 'circle',
                },
            },
        ];
        return (await CirclePostModel.aggregate(query));
    }
}