import PostModel from '../models/Post.model';
import UserModel from '../models/User.model';
import {IComment, IPost} from '../interfaces/IPost';
import {logger} from '@shared';
import FollowsModel, {IFollower} from '../models/Follower.model';
import * as IORedis from 'ioredis';
import CommentModel from '../models/Comment.model';
import {S3} from '@lib';
import {Types} from 'mongoose';
import moment = require('moment');

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
                authorAvatar: postObject.authorAvatar,
                author: postObject.author,
                userTag: postObject.userTag,
                text: postObject.text,
                video: '',
                image: '',
                name: postObject.name,
                campus: postObject.campus,
                parentPost: postObject.parentPost,
                createdAt: moment().valueOf(),
            });

            if (postObject.image !== ('' || undefined)) {
                const s3 = new S3(post.id + 'image', postObject.image, 'image');
                post.image = await s3.UploadImage() as string;
            }

            if (postObject.video !== ('' || undefined)) {
                const s3 = new S3(post.id + 'video', postObject.video, 'video');
                post.video = await s3.UploadVideo() as string;
            }

            post = await post.save();

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
                    const postKeys = await primaryCache.zrevrange(userID, options.offset, -1);

                    // Since feed has been retrieved, remove it from set of dirty feeds
                    primaryCache.srem('dirty', userID);

                    const objectIDs = postKeys.map(key => Types.ObjectId(key));

                    // Hydrate the feed list (Get posts with the keys retrieved)
                    const newsfeed = await this.Hydrate(objectIDs, userID);

                    // const posts = await primaryCache.
                    return {newsfeed};

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

                    const newsfeed = await PostModel.find({ author: { $in: arr } }).limit(150).sort({ createdAt: -1 }).exec();
                    // const newsfeed = await this.SortPost(Posts, {reverse: true});
                    return { newsfeed };
                }
            } catch (error) {
                logger.error(error);
            }
        }

    }

    public static async LikePost(userID: string, postID: string, postCache: IORedis.Redis, collection: string, parentPostID?: string) {
        try {
            // const likedBy = await LikedByModel.find({postID, userID}).exec();
            const likedBy = await PostModel.findOne({_id: postID, likedBy: {$in: [userID]}}).exec();
            // const isInCache = await postCache.exists(postID);
            if (likedBy === null) {
                switch (collection) {
                    case 'post':
                        const post = await PostModel.findByIdAndUpdate(postID, {
                            $inc: {likes: 1},
                            $push: {likedBy: userID},
                        }).lean().exec();
                        UserModel.findByIdAndUpdate(post.author, {$inc: {'userProfile.rep_points': 0.25}}).exec();
                        break;

                    case 'comment':
                        const comment = await CommentModel.findByIdAndUpdate(postID, {
                            $inc: {likes: 1},
                            $push: {likedBy: userID},
                        }).lean().exec();
                        UserModel.findByIdAndUpdate(comment.author, {$inc: {'userProfile.rep_points': 0.15}}).exec();
                        break;
                    default:
                        return;
                }
            } else {

                switch (collection) {
                    case 'post':
                        // TODO: Remove userID from list
                        const post = await PostModel.findByIdAndUpdate(postID, {
                            $inc: {likes: 1},
                            $push: {likedBy: userID},
                        }).lean().exec();
                        UserModel.findByIdAndUpdate(post.author, {$inc: {'userProfile.rep_points': -0.25}}).exec();
                        break;
                    case 'comment':
                        const comment = await CommentModel.findByIdAndUpdate(postID, {
                            $inc: {likes: 1},
                            $push: {likedBy: userID},
                        }).lean().exec();
                        UserModel.findByIdAndUpdate(comment.author, {$inc: {'userProfile.rep_points': -0.25}}).exec();
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

    public static async Comment(commentObject: IComment, postCache: IORedis.Redis) {
        try {
            const newComment = {
                commentID: '',
                userTag: commentObject.userTag,
                name: commentObject.name,
                campus: commentObject.campus,
                text: commentObject.text,
                video: commentObject.video,
                image: commentObject.image,
                parentPost: commentObject.parentPost,
                authorAvatar: commentObject.authorAvatar,
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
     * @param postCache
     * @param limit - The limit of comments to fetch from the feed
     * @param userID
     * @param offset - Offset
     * @constructor
     */

    public static async GetComments(parentPostID: string, postCache: IORedis.Redis, limit: number, userID: string, offset: number) {
        try {

            if (await postCache.exists(`post_comments_index:${parentPostID}`) === 1) {
                const commentIDs = await postCache.zrevrange(`post_comments_index:${parentPostID}`, offset, limit);

                const pipeline = postCache.pipeline();

                for (const commentID of commentIDs) {
                    pipeline.hgetall(commentID);
                    pipeline.sismember(`likes:${commentID}`, userID.toString());
                }

                const pipelineResult = await pipeline.exec();

                const filtered: any = [];

                for (let i = 0; i < pipelineResult.length; i++) {
                    const currentItem = pipelineResult[i][1];
                    const nextItem = pipelineResult[i === pipelineResult.length - 1 ? 0 : i + 1][1];

                    if (Object.entries(currentItem).length !== 0) {
                        nextItem !== 0 ? currentItem.isLiked = true : currentItem.isLiked = false;
                        filtered.push(currentItem);
                    }
                    // nextItem === 1 ? filtered.push([currentItem, {isliked: true}]) : filtered.push([currentItem, {isliked: false}]);
                }

                return {comments: filtered};
            } else {
                const comments = await CommentModel.find({parentPost: parentPostID})
                    .lean()
                    .populate('author', {name: 1, userProfile: 1, userTag: 1})
                    .populate('parentPost')
                    .exec();
                return {comments};
            }

        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public static async CheckFeedStatus(userID: string, primaryCache: IORedis.Redis) {
        if (await primaryCache.sismember('dirty', userID) === 1) {
            return {newsfeedStatus: 'dirty'};
        } else {
            return {newsfeedStatus: 'sanitized'};
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
                    $match: {_id: {$in: keys}},
                },
                {
                    $addFields: {
                        isLiked: {$in: [userID, '$likedBy']},
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
                        let: {authorID: '$author'},
                        pipeline: [
                            {$match: {$expr: {$eq: ['$_id', '$$authorID']}}},
                            {$project: {password: 0, email: 0}},
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

    private static async CheckLikedBy(feed: any[], userID: string) {

        const filtered: any = [];
        for (let i = 0; i < feed.length; i++) {
            const currentElement = feed[i];

            if ((currentElement[i + 1] === 0) || (currentElement[i + 1] === 1)) {
                // tslint:disable-next-line: max-line-length
                currentElement[i + 1] === 1 ? filtered.push([currentElement, {isliked: true}]) : filtered.push([currentElement, {isliked: false}]);
            }
        }

        return filtered;
    }

    /**
     * @desc  Calculates the top post on the platform 
     * @param postCache 
     */
    // public static async CalcTopPosts(postCache: IORedis.Redis) {

    //     // Get all the posts on the platform
    //     const postsIDs = await postCache.smembers('post-index');

    //     const pipeline = postCache.pipeline();

    //     for (let index = 0; index < postsIDs.length; index++) {
    //         const post = postsIDs[index];

    //         pipeline.hgetall(post);

    //     }
    //     const piplelineResult = await pipeline.exec();

    //     const scored: Array<{postID: string, score: string}> = [];

    //     //  Calculate the score for each post 

    //     for (let index = 0; index < piplelineResult.length; index++) {
    //         const post = piplelineResult[index][1];
    //         const likes = post.likes;
    //         const likesWeight = 4;
    //         // const dislikes = post.likes; // Not considering this yet
    //         const comments  = post.comments;
    //         const commentsWeight = 5;

    //         const score = ((likes * likesWeight ) + (comments * commentsWeight)).toString();

    //         scored.push({postID: post.postID, score});
    //     }

    //     // Cache top posts in set
    //     for (let index = 0; index < scored.length; index++) {
    //         const scoredElement = scored[index];

    //         pipeline.zadd('top-posts', scoredElement.postID, scoredElement.score);
    //     }

    //     pipeline.exec();
    // }

    // public static async GetTopPosts(postCache: IORedis.Redis) {
    //     const topPosts = await postCache.zrevrange('top-posts', 0, -1);

    //     return topPosts;
    // }
    // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}
