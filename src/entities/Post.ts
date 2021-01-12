import PostModel from '../models/Post.model';
import UserModel from '../models/User.model';
import { IComment, IPost } from '../interfaces/IPost';
import { logger } from '@shared';
import FollowsModel, { IFollower } from '../models/Follower.model';
import * as IORedis from 'ioredis';
import CommentModel from '../models/Comment.model';
import { S3 } from '@lib';
import { Types } from 'mongoose';
import moment = require('moment');
import CirclePostModel from '../models/CirclePost.model';

interface IOptions {
    mostRecent?: boolean;
    first100?: boolean;
    offset: number;
    limit: number;
}

export interface IPostOptions {
    anonymous: boolean;
}

interface IPostType {
    name: string;
}

// enum PostTypes {
//     name = 'REPOST',
// }
export class Post {

    // tslint:disable-next-line: max-line-length
    public static async CreatePost(postObject: IPost, userID: string, type: IPostType, primaryCache: IORedis.Redis) {
        try {
            // tslint:disable-next-line: no-shadowed-variable
            let post = new PostModel({
                author: postObject.author,
                text: postObject.text,
                campus: postObject.campus,
                parentPost: postObject.parentPost,
                createdAt: moment().valueOf(),
            });

            if (postObject.image !== '') {
                const s3 = new S3(post.id + 'image', postObject.image, 'image');
                post.image = await s3.UploadImage() as string;
            }

            if (postObject.video !== '') {
                const s3 = new S3(post.id + 'video', postObject.video, 'video');
                post.video = await s3.UploadVideo() as string;
            }

            post = await post.save();

            // Update the post_count in users document
            UserModel.updateOne({_id: userID}, {$inc: {'userProfile.post_count': 1}}).exec();

            const followers: IFollower[] = await FollowsModel.find({ target: userID }).lean().exec();

            if (followers.length === 0) {
                return;
            }

            // Add post to campus Feed
            primaryCache.sadd(post.campus, `${post.id}:${post.createdAt}`);

            if ((await primaryCache.sismember('campuses', post.campus)) === 0) {
                primaryCache.sadd('campuses', post.campus.toLowerCase());
            }

            // Create Pipeline here to drastically reduce time spent
            //  Offload this work to another thread
            const pipeline = primaryCache.pipeline();
            for (const follower of followers) {
                // primaryCache.lpush(follower.follower, post.id);
                pipeline.zadd(follower.follower.toString(), post.createdAt.toString(), post.id);
                pipeline.sadd('dirty', follower.follower);
            }
            pipeline.exec();

            // Also return ID of the newsfeed updated
        } catch (error) {
            logger.error(error);
        }
    }

    public static async GetPosts(primaryCache: IORedis.Redis, postCache: IORedis.Redis, userID: string, options: IOptions) {
        if (options!.mostRecent) {
            try {
                /**
                 *  Check the cache for newsfeed
                 */
                const exists = await primaryCache.exists(userID) === 1;

                if (exists) {

                    // Get all the postIDs in the users newsfeed
                    const postKeys = await primaryCache.zrevrange(userID, options.offset, options.limit);

                    // Since feed has been retrieved, remove it from set of dirty feeds
                    primaryCache.srem('dirty', userID);

                    const objectIDs = postKeys.map(key => Types.ObjectId(key));

                    // Hydrate the feed list (Get posts with the keys retrieved)
                    const newsfeed = await this.Hydrate(objectIDs, userID);

                    // const posts = await primaryCache.
                    return { newsfeed };

                } else {
                    // TODO: Optimize this block

                    // Get people user follows
                    const followings = await FollowsModel.find({
                        follower: userID,
                    }, { target: 1 }).lean().exec();

                    //  TODO: A worker should be spawned to do tasks from here
                    const arr: string[] = [];

                    followings.forEach((x: { target: string; }) => {
                        arr.push(x.target);
                    });



                    const newsfeed = await PostModel.find({ author: { $in: arr } }).limit(800).sort({ createdAt: -1 }).exec();

                    const pipeline =  primaryCache.pipeline();

                    for (let index = 0; index < newsfeed.length; index++) {
                        const post = newsfeed[index];
                        pipeline.zadd(userID, post.createdAt.toString(), post.id);
                    }

                    pipeline.exec();
                    
                    return { newsfeed };
                }
            } catch (error) {
                logger.error(error);
            }
        }

    }

    public static async LikePost(userID: string, postID: string, collection: string) {
        try {
            let likedBy: any;
            const findLikedByQuery = { _id: postID, likedBy: { $in: [userID] } };
            const updateLikeQuery = { $inc: { likes: 1 }, $push: { likedBy: userID } };
            const updateUserQuery = { $inc: { 'userProfile.rep_points': 0.25 } };

            switch (collection) {
                case 'post':
                    likedBy = await PostModel.findOne(findLikedByQuery).lean().exec();
                    break;

                case 'comment':
                    likedBy = await CommentModel.findOne(findLikedByQuery).lean().exec();
                    break;

                case 'circlePost':
                    likedBy = await CirclePostModel.findOne(findLikedByQuery).lean().exec();
                    break;

                default:
                    break;
            }

            if (likedBy === null) {
                switch (collection) {
                    case 'post':
                        const post = await PostModel.findByIdAndUpdate(postID, updateLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(post.author, updateUserQuery).exec();
                        return {result: 'liked'};

                    case 'comment':
                        const comment = await CommentModel.findByIdAndUpdate(postID, updateLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(comment.author, updateUserQuery).exec();
                        return {result: 'liked'};

                    case 'circlePost':
                        const circlePost = await CirclePostModel.findByIdAndUpdate(postID, updateLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(circlePost.author, updateUserQuery).exec();
                        return {result: 'liked'};

                    default:
                        break;
                }
            } else {
                const updateUnLikeQuery = { $inc: { likes: -1 }, $pull: { likedBy: { $in: [userID] } } };
                const updateUserQueryNegate = { $inc: { 'userProfile.rep_points': -0.25 } };

                switch (collection) {
                    case 'post':
                        // TODO: Remove userID from list
                        const post = await PostModel.findByIdAndUpdate(postID, updateUnLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(post.author, updateUserQueryNegate).exec();
                        return {result: 'unliked'};
                    case 'comment':
                        const comment = await CommentModel.findByIdAndUpdate(postID, updateUnLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(comment.author, updateUserQueryNegate).exec();
                        return {result: 'unliked'};
                    case 'circlePost':
                        const circlePost = await CirclePostModel.findByIdAndUpdate(postID, updateUnLikeQuery).lean().exec();
                        UserModel.findByIdAndUpdate(circlePost.author, updateUserQueryNegate).exec();
                        return {result: 'unliked'};
                    default:
                        break;
                }
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async DislikePost(userID: string, postID: string, postCache: IORedis.Redis) {

        // TODO: Check if post has been disliked already, if it has, undislike it, check if it has been liked too
        try {

            PostModel.findByIdAndUpdate(postID, { $inc: { dislikes: 1 } }).exec();
            UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.20 } }).exec();
            postCache.hincrby(postID, 'likes', 1);

            return 0;
        } catch (error) {
            throw new Error(error);
        }
    }

    public static async Comment(commentObject: IComment) {
        try {
            const newComment = {
                commentID: '',
                campus: commentObject.campus,
                text: commentObject.text,
                video: commentObject.video,
                image: commentObject.image,
                parentPost: commentObject.parentPost,
                author: commentObject.author,
                createdAt: moment().valueOf(),
            } as IComment;

            const comment = new CommentModel(newComment);
            comment.commentID = comment.id;
            comment.save();

        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    /**
     *
     * @param parentPostID
     * @param limit - The limit of comments to fetch from the feed
     * @param userID
     * @param page
     * @constructor
     */

    public static async GetComments(parentPostID: string, userID: string, limit: number, page: number) {
        try {
            const aggregate = [
                {
                    $match: { parentPost: Types.ObjectId(parentPostID) },
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

            const agg = CommentModel.aggregate(aggregate);
            // @ts-ignore
            const comments = await CommentModel.aggregatePaginate(agg, options);

            return { comments: comments.docs };

        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public static async CheckFeedStatus(userID: string, primaryCache: IORedis.Redis) {
        if (await primaryCache.sismember('dirty', userID) === 1) {
            return { newsfeedStatus: 'dirty' };
        } else {
            return { newsfeedStatus: 'sanitized' };
        }

    }

    /**
     * Retrives posts from cache`
     *
     * @param keys Keys of the post
     * @param userID
     */
    private static async Hydrate(keys: Types.ObjectId[], userID: string) {
        try {
            const aggregate = [
                {
                    $match: { _id: { $in: keys } },
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
            return await PostModel.aggregate(aggregate).exec();
        } catch (e) {
            logger.error(e);
        }

    }
}
