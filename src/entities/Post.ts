import PostModel from '../models/Post.model';
import FollowingModel, {IFollowing} from '../models/Following.model';
import UserModel from '../models/User.model';
import {IPost, IPostModel} from 'src/interfaces/IPost';
import {logger} from '../shared/Logger';
import arraySort from 'array-sort';
import moment from 'moment';
import FollowerModel, {IFollower} from '../models/Follower.model';
import * as IORedis from 'ioredis';

// import { bool } from 'aws-sdk/clients/signer';

interface IOptions {
    mostRecent?: boolean;
    first100?: boolean;
}

export class Post {
    constructor() {
    }

    public static async CreatePost(postObject: IPost, userID: string, client: IORedis.Redis) {
        try {
            const post = await new PostModel({
                author: userID,
                userTag: postObject.userTag,
                text: postObject.text,
                video: postObject.video,
                image: postObject.image,
                createdAt: moment().format('lll'),
            });

            const followers: IFollower[] = await FollowerModel.find({target: userID});

            for (const follower of followers) {
                const cahcedPost = JSON.stringify({[userID]: post});
                await client.sadd(follower.follower, cahcedPost);
            }

            post.save();

            return 0;
        } catch (error) {
            console.log(error);
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
                    const posts: IPostModel[] = [];
                    const cachedPosts = await client.smembers(userID);

                    for (const cachedPost of cachedPosts) {
                        const parsed = JSON.parse(cachedPost);
                        for (const newsfeedID in parsed) {
                            if (parsed.hasOwnProperty(newsfeedID)) {
                                const post = parsed[newsfeedID];
                                posts.push(post);
                            }
                        }
                    }

                    return {newsfeed: await this.SortPost(posts, {reverse: true})};
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

                    followings.forEach((x) => {
                        arr.push(x.target);
                    });

                    const Posts = await PostModel.find({author: {$in: arr}});
                    const newsfeed = await this.SortPost(Posts, {reverse: true});
                    return {newsfeed};
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
            PostModel.findByIdAndUpdate(postID, {$inc: {likes: 1}, likedBy: userID}).exec();
            UserModel.findByIdAndUpdate(userID, {$inc: {'userProfile.rep_points': 0.25}}).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async DislikePost(userID: string, postID: string) {
        try {
            PostModel.findByIdAndUpdate(postID, {$inc: {dislikes: 1}}).exec();
            UserModel.findByIdAndUpdate(userID, {$inc: {'userProfile.rep_points': 0.20}}).exec();
            return 0;
        } catch (error) {
            throw new Error(error);
        }
    }

    private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
        if (options) {
            return arraySort(posts, 'createdAt', {reverse: options.reverse});
        } else {
            return arraySort(posts, 'createdAt');
        }
    }

}