import PostModel from '../models/Post.model';
import FollowingModel, { IFollowing } from '../models/Following.model';
import UserModel from '../models/User.model';
import { IComment, IPost, IPostModel } from '../interfaces/IPost';
import { logger } from '../shared/Logger';
import arraySort from 'array-sort';
import moment from 'moment';
import FollowsModel, { IFollower } from '../models/Follower.model';
import * as IORedis from 'ioredis';
import CommentModel from '../models/Comment.model';
import { S3 } from '../lib/s3';
import { post } from 'request';

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
    public static async CreatePost(postObject: IPost, userID: string, primaryCache: IORedis.Redis, postCache: IORedis.Redis, options: IPostOptions) {
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

            const expireTime = process.env.POST_EXPIRE_TIME as unknown as number

            postCache.expire(post.id, expireTime); // Development Expire time


            // Index post
            postCache.sadd('post-index', post.id);

            const followers: IFollower[] = await FollowsModel.find({ target: userID }).lean().exec();

            if (followers.length === 0) {
                return;
            }

            // Add post to campus Feed
            await primaryCache.lpush(post.campus, post.id);

            // TODO: Stop doing this on each post
            if ((await primaryCache.sismember('campuses', post.campus)) === 0) {
                primaryCache.sadd('campuses', post.campus.toLowerCase());
            }

            //  Offload this work to another thread
            for (const follower of followers) {
                // primaryCache.lpush(follower.follower, post.id);
                primaryCache.sadd(follower.follower, post.id);
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
                    let newsfeed = await this.Hydrate(postKeys, postCache);

                    // newsfeed = newsfeed.map(item => {
                    //    if (Object.entries(item[1]).length !== 0) {
                    //        return item[1];
                    //    }
                    // });

                    const filteredFeed = [];

                    // TODO: Find a way to remove expired posts from users feed, if not it just keeps taking up space
                    for (let i = 0; i < newsfeed.length; i++) {
                        if (Object.entries(newsfeed[i][1]).length !== 0 ) {
                            filteredFeed.push(newsfeed[i][1]);
                        }
                    }

                    // const posts = await primaryCache.
                    return { newsfeed: filteredFeed };

                } else {
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
            /**
             *  Increment Post likes and update the likedBy field
             */
            await PostModel.findByIdAndUpdate(postID, { $inc: { likes: 1 }, likedBy: userID }).exec();
            await UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();
            postCache.hincrby(postID, 'likes', 1);

            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async DislikePost(userID: string, postID: string, postCache: IORedis.Redis) {
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
            const comment = new CommentModel(commentObject);
            comment.save();
            // const pipeline = postCache.pipeline();

            // pipeline.hincrby(commentObject.parentPost, 'comments', 1);
            // pipeline.hmset(`comment:${comment.id}`, commentObject);
            // pipeline.expire(`comment:${comment.id}`, 86400);
            // pipeline.zadd('comments-index', '0', `comment:${comment.id}`);

            // pipeline.exec();

            return 0;
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public static async GetComments(postID: string) {
        try {
            const comments = await CommentModel.find({ parentPost: postID })
                .lean()
                .populate('author', { name: 1, userProfile: 1, userTag: 1 })
                .populate('parentPost')
                .exec();
            return { comments };
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    /**
     * Retrives posts from cache`
     * 
     * @param keys Keys of the post
     */
    private static async Hydrate(keys: string[], postCache: IORedis.Redis) {
        const pipeline = postCache.pipeline();

        for (const key of keys) {
            pipeline.hgetall(key);
        }

        return await pipeline.exec();
    }

    public static async CheckFeedStatus(userID: string, primaryCache: IORedis.Redis) {
        if (await primaryCache.sismember('dirty', userID) === 1) {
            return { newsfeedStatus: 'dirty' };
        } else {
            return { newsfeedStatus: 'sanitized' };
        }

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
