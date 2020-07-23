import PostModel from '../models/Post.model';
import FollowingModel, { IFollowing } from '../models/Following.model';
import UserModel from '../models/User.model';
import { IComment, IPost, IPostModel } from '../interfaces/IPost';
import { logger } from '../shared/Logger';
import arraySort from 'array-sort';
import moment from 'moment';
import FollowerModel, { IFollower } from '../models/Follower.model';
import * as IORedis from 'ioredis';
import CommentModel from '../models/Comment.model';
import { S3 } from '../lib/s3';

// import { bool } from 'aws-sdk/clients/signer';

interface IOptions {
    mostRecent?: boolean;
    first100?: boolean;
}

export interface IPostOptions {
    anonymous: boolean;
}

export class Post {
    constructor() { }

    // tslint:disable-next-line: max-line-length
    public static async CreatePost(postObject: IPost, userID: string, client: IORedis.Redis, options: IPostOptions) {
        try {

            // TODO: Optimize this block
            // if (options.anonymous) {
            //     let post = await new PostModel({
            //         text: postObject.text,
            //         video: postObject.video,
            //         image: postObject.image,
            //         createdAt: moment().format('lll'),
            //         campus: postObject.campus,
            //     });

            //     post = await post.save();

            //     const followers: IFollower[] = await FollowerModel.find({target: userID});
            //     const updatedFeeds: Array<{ updatedHash: string, newPostID: string }> = [];

            //     // Add post to campus Feed
            //     await client.hmset(post.campus, {[post._id]: post, state: 'dirty'});

            //     // Check if a campus is a member of the set, if not, add them

            //     // TODO: Stop doing this on each post
            //     if ( await client.sismember('campuses', post.campus) === 0) {
            //         await client.sadd('campuses', post.campus);
            //     }

            //     for (const follower of followers) {

            //         /**
            //          * Set the state of a users newsfeed in the cache
            //          * - sanitized: It hasnt been updated
            //          * - dirty: It has been updated
            //          */
            //         await client.hmset(follower.follower, {[post._id]: post, state: 'dirty'});
            //         updatedFeeds.push({updatedHash: follower.follower, newPostID: post._id});
            //     }

            //     // Also return ID of the newsfeed updated
            //     return {
            //         opsValue: 0,
            //         updatedFeeds,
            //     };

            // } else {

            let post = new PostModel({
                author: userID,
                userTag: postObject.userTag,
                text: postObject.text,
                video: '',
                image: '',
                createdAt: moment().format('lll'),
                name: postObject.name,
                campus: postObject.campus,
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

            const followers: IFollower[] = await FollowerModel.find({ target: userID }).lean().exec();
            const updatedFeeds: Array<{ updatedHash: string, newPostID: string }> = [];

            // Add post to campus Feed
            await client.hmset(post.campus, { [post.id]: post, state: 'dirty' });
            

            // TODO: Stop doing this on each post
            if ((await client.sismember('campuses', post.campus)) === 0) {
                await client.sadd('campuses', post.campus);
            }

            for (const follower of followers) {

                /**
                 * Set the state of a users newsfeed in the cache
                 * - sanitized: It hasnt been updated
                 * - dirty: It has been updated
                 */
                await client.hmset(follower.follower, { [post.id]: post, state: 'dirty' });
                 // TODO: Set TTL

                updatedFeeds.push({ updatedHash: follower.follower, newPostID: post.id });
            }

            // Also return ID of the newsfeed updated
            return {
                opsValue: 0,
                updatedFeeds,
            };
            // }
        } catch (error) {
            logger.error(error);
        }
    }

    public static async GetPosts(client: IORedis.Redis, userID: string, options?: IOptions) {
        if (options!.mostRecent) {
            try {
                /**
                 *  Check the cache for newsfeed
                 */
                const exists = await client.exists(userID) === 1;
                if (exists) {
                    // const posts: IPostModel[] = [];
                    const cachedPosts = await client.hgetall(userID);

                    return { newsfeed: cachedPosts };
                } else {
                    const followings = await FollowingModel.find({
                        follower: userID,
                    },
                        {
                            target: 1,
                        },
                    )
                        .exec();
                    //  TODO: A worker should be spawned to do tasks from here
                    const arr: string[] = [];

                    followings.forEach(x => {
                        arr.push(x.target);
                    });

                    const Posts = await PostModel.find({ author: { $in: arr } });
                    // const newsfeed = await this.SortPost(Posts, {reverse: true});
                    return { Posts };
                }
            } catch (error) {
                logger.error(error);
            }
        }

    }

    public static async LikePost(userID: string, postID: string) {
        try {
            /**
             *  Increment Post likes and update the likedBy field
             */
            await PostModel.findByIdAndUpdate(postID, { $inc: { likes: 1 }, likedBy: userID }).exec();
            await UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async DislikePost(userID: string, postID: string) {
        try {
            PostModel.findByIdAndUpdate(postID, { $inc: { dislikes: 1 } }).exec();
            UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.20 } }).exec();
            return 0;
        } catch (error) {
            throw new Error(error);
        }
    }

    public static async Comment(commentObject: IComment) {
        try {
            const comment = new PostModel(commentObject).save();
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

    // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}
