import PostModel from '../models/Post.model';
import UserModel from '../models/User.model';
import {IComment, IPost} from '../interfaces/IPost';
import {logger} from '@shared';
import FollowsModel, { IFollower } from '../models/Follower.model';
import * as IORedis from 'ioredis';
import CommentModel from '../models/Comment.model';
import { S3 } from '../lib/s3';
import LikedByModel from '../models/LikedBy.model';

// import { bool } from 'aws-sdk/clients/signer';

interface IOptions {
    mostRecent?: boolean;
    first100?: boolean;
}

export interface IPostOptions {
    anonymous: boolean;
}

export class Post {

    // tslint:disable-next-line: max-line-length
    public static async CreatePost(postObject: IPost, userID: string, primaryCache: IORedis.Redis, postCache: IORedis.Redis) {
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
                createdAt: Date.now(),
            });

            if (postObject.image != null) {
                const s3 = new S3(post.id + 'image', postObject.image, 'image');
                post.image = await s3.UploadImage() as string;
            }

            if (postObject.video) {
                const s3 = new S3(post.id + 'video', postObject.video, 'video');
                post.video = await s3.UploadVideo() as string;
            }

            post = await post.save();

            const cachedPost: IPost = {
                authorAvatar: post.authorAvatar,
                postID: post.id,
                author: post.author,
                userTag: post.userTag,
                text: post.text,
                video: post.video,
                image: post.image,
                createdAt: post.createdAt,
                name: postObject.name,
                campus: post.campus,
                likes: 0,
                dislikes: 0,
                comments: 0,
            };

            // Add post to post cache
            postCache.hmset(post.id, cachedPost);

            const expireTime = process.env.POST_EXPIRE_TIME as unknown as number;

            postCache.expire(post.id, expireTime); // Development Expire time

            // Index post
            postCache.sadd('post-index', post.id);

            const followers: IFollower[] = await FollowsModel.find({ target: userID }).lean().exec();

            if (followers.length === 0) {
                return {
                    opsValue: 0,
                };
            }

            // Add post to campus Feed
            primaryCache.lpush(post.campus, post.id);

            if ((await primaryCache.sismember('campuses', post.campus)) === 0) {
                primaryCache.sadd('campuses', post.campus.toLowerCase());
            }

            //  Offload this work to another thread
            for (const follower of followers) {
                // primaryCache.lpush(follower.follower, post.id);
                primaryCache.sadd(follower.follower.toString(), post.id);
                primaryCache.sadd('dirty', follower.follower);
            }

            // Also return ID of the newsfeed updated
            return {
                opsValue: 0,
            };

        } catch (error) {
            logger.error(error);
        }
    }

    public static async GetPosts(primaryCache: IORedis.Redis, postCache: IORedis.Redis, userID: string, options?: IOptions) {
        if (options!.mostRecent) {
            try {
                /**
                 *  Check the cache for newsfeed
                 */
                const exists = await primaryCache.exists(userID) === 1;

                if (exists) {

                    // Get all the postIDs in the users newsfeed
                    // const postKeys = await primaryCache.lrange(userID, 0, -1);
                    const postKeys = await primaryCache.smembers(userID);

                    // Since feed has been retrieved, remove it from set of dirty feeds
                    primaryCache.srem('dirty', userID);

                    // Hydrate the feed list (Get posts with the keys retrieved)
                    const newsfeed = await this.Hydrate(postKeys, postCache, userID);

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

    public static async LikePost(userID: string, postID: string, postCache: IORedis.Redis) {
        try {
            const likedBy = await LikedByModel.find({postID, userID}).exec();

            if (likedBy.length === 0) {

                PostModel.findByIdAndUpdate(postID, {$inc: {likes: 1}, likedBy: userID}).exec();
                UserModel.findByIdAndUpdate(userID, {$inc: {'userProfile.rep_points': 0.25}}).exec();

                // @ts-ignore
                new LikedByModel({
                    postID,
                    userID,
                }).save();

                const pipeline = postCache.pipeline();

                pipeline.hincrby(postID, 'likes', 1);
                pipeline.sadd(`likes:${postID}`, userID);
                pipeline.expire(`likes:${postID}`, process.env.POST_EXPIRE_TIME as unknown as number);
                pipeline.exec();

                return {ops: 'liked'};
            } else {
                PostModel.findByIdAndUpdate(postID, {$inc: {likes: 1}, likedBy: userID}).exec();
                UserModel.findByIdAndUpdate(userID, {$inc: {'userProfile.rep_points': 0.25}}).exec();
                LikedByModel.deleteOne({postID, userID}).exec();

                const pipeline = postCache.pipeline();
                pipeline.hincrby(postID, 'likes', -1);
                pipeline.srem(`likes:${postID}`, userID);
                pipeline.exec();

                return {ops: 'unliked'};
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

    // public static async Comment(commentObject: IComment, postCache: IORedis.Redis) {
    //     try {
    //         const newComment = {
    //             commentID: '',
    //             userTag: commentObject.userTag,
    //             name: commentObject.name,
    //             campus: commentObject.campus,
    //             text: commentObject.text,
    //             video: commentObject.video,
    //             image: commentObject.image,
    //             parentPost: commentObject.parentPost,
    //             authorAvatar: commentObject.authorAvatar,
    //             author: commentObject.author,
    //         } as IComment;
    //
    //         const comment = new CommentModel(newComment);
    //         comment.commentID = comment.id;
    //         comment.save();
    //
    //         const pipeline = postCache.pipeline();
    //         const expireTime = process.env.POST_EXPIRE_TIME as unknown as number;
    //
    //         pipeline.hincrby(commentObject.parentPost, 'comments', 1);
    //         pipeline.hmset(`comments:${comment.id}`, commentObject);
    //         pipeline.zadd(`post_comments_index:${comment.parentPost}`, '0', comment.id);
    //         pipeline.expire(`comments:${comment.id}`, expireTime);
    //         pipeline.expire(`post_comments_index:${comment.parentPost}`, expireTime);
    //
    //         pipeline.exec();
    //
    //         return 0;
    //     } catch (e) {
    //         logger.error(e);
    //         throw new Error(e);
    //     }
    // }

    // public static async GetComments(parentPostID: string, postCache: IORedis.Redis, limit: number, userID: string) {
    //     try {
    //
    //         if (await postCache.exists(`post_comments_index:${parentPostID}`) === 1) {
    //             const commentIDs = await postCache.zrevrange(`post_comments_index:${parentPostID}`, 0, limit);
    //
    //             const pipeline = postCache.pipeline();
    //
    //             for (const commentID of commentIDs) {
    //                 pipeline.hgetall(`comments:${commentID}`);
    //                 pipeline.sismember(`$likes:${commentID}`, userID);
    //             }
    //
    //             const pipelineResult = await pipeline.exec();
    //
    //             return {comments: filtered};
    //         } else {
    //             const comments = await CommentModel.find({parentPost: parentPostID})
    //                 .lean()
    //                 .populate('author', {name: 1, userProfile: 1, userTag: 1})
    //                 .populate('parentPost')
    //                 .exec();
    //             return {comments};
    //         }
    //
    //     } catch (e) {
    //         logger.error(e);
    //         throw new Error(e);
    //     }
    // }

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
     * @param postCache
     * @param userID
     */
    private static async Hydrate(keys: string[], postCache: IORedis.Redis, userID: string) {
        const pipeline = postCache.pipeline();

        for (const key of keys) {
            pipeline.hgetall(key);
            pipeline.sismember(`posts:${key}`, userID);
        }

        const pipelineResult = await pipeline.exec();

        // Filter the result
        const filtered: any = [];

        // TODO: Find a way to remove expired posts from users feed, if not it just keeps taking up space
        for (let i = 0; i < pipelineResult.length; i++) {
            const currentItem = pipelineResult[i][1];
            const nextItem = pipelineResult[i === pipelineResult.length - 1 ? 0 : i + 1][1];

            if (Object.entries(pipelineResult[i][1]).length !== 0) {
                nextItem === 1 ? filtered.push([currentItem, {isliked: true}]) : filtered.push([currentItem, {isliked: false}]);
            }
        }

        return filtered;
    }

    private static async CheckLikedBy(feed: any[], userID: string) {

        const filtered: any = [];
        for (let i = 0; i < feed.length; i++) {
            const currentElement = feed[i];

            if ((currentElement[i + 1] === 0) || (currentElement[i + 1] === 1)) {
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
