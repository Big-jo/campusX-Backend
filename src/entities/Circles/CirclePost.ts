import { Post } from '../Post';
import CircleCirclePostModel from '../../models/CirclePost.model';
import { ICirclePost, ICircleComment } from '../../interfaces/ICirclePost';
import { logger } from '@shared';
import IORedis from 'ioredis';
import CirclePostModel from '../../models/CirclePost.model';
import { S3 } from '../../lib/s3';
import CircleMemberModel from '../../models/CircleMember.model';
import LikedByModel from '../../models/LikedBy.model';
import PostModel from '../../models/Post.model';
import UserModel from '../../models/User.model';
import CommentModel from '../../models/Comment.model';
import { ICommentModel, IComment } from '../../interfaces/IPost';
import moment from 'moment';
import CircleCommentModel from '../../models/CircleComment.model';
import {AggregationQueries, Utility} from '@lib';
import sort from 'array-sort';
import mongoose from 'mongoose';

// interface ICPost {

// }

export class CirclePost extends Post {

    // constructor() {}

    // tslint:disable-next-line: max-line-length
    public static async CirclePost(circlePost: ICirclePost, media: any, redis: IORedis.Redis) {
        try {
            const isMember = await CircleMemberModel.findById(circlePost.memberID).lean().exec();
            if (isMember !== null) {
                const CPost: ICirclePost = {
                    circleID: circlePost.circleID,
                    memberID: circlePost.memberID,
                    text: circlePost.text,
                    video: '',
                    image: '',
                    author: circlePost.author,
                    campus: circlePost.campus,
                    parentPost: circlePost.parentPost,
                    createdAt: moment().valueOf(),
                };

                const post = new CirclePostModel(CPost);

                CPost.postID = post.id;

                if (media !== undefined) {
                    const s3 = new S3(post.id, media.file, 'image');

                    media.tag === 'image' ? post.image = await s3.UploadImage() as string : post.video = await s3.UploadImage() as string;
                }

                redis.zadd(`circlePost:${circlePost.circleID}`, '0', post.id);

                await post.save();
                return {msg: 'Created'};
            } else {
                return { error: 'Sorry cannot post if you are not a member' };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async LikePost(userID: string, postID: string, collection: string, redis: IORedis.Redis, circleID: string) {
        try {
            // Check if member exists in circlePosts set
            redis.zincrby(`circlePost:${circleID}`, 1, postID);
            return (await super.LikePost(userID, postID, 'circlePost', null, null));

        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Comment(commentObject: ICircleComment, fcm_token: string, primaryCache: IORedis.Redis) {
        try {
            return super.Comment(commentObject, fcm_token, primaryCache);
        } catch (error) {
            
        }
    }
    // public static async CircleComment(commentObject: ICircleComment, media: any, redis: IORedis.Redis) {
    //     try {
    //         const comment: ICircleComment = {
    //             campus: commentObject.campus,
    //             parentPost: commentObject.parentPost,
    //             createdAt: moment().valueOf(),
    //             author: commentObject.author,
    //             comments: 0,
    //             dislikes: 0,
    //             image: commentObject.image,
    //             likes: 0,
    //             text: commentObject.text,
    //             video: commentObject.video,
    //             circleID: commentObject.circleID,
    //             memberID: commentObject.memberID,
    //         };

    //         const createdComment = new CircleCommentModel(comment);

    //         // let s3;
    //         //
    //         // if (media.type === 'image') {
    //         //     s3 = new S3(createdComment.id, media.file, 'image');
    //         //     createdComment.image = await s3.UploadImage();
    //         // } else {
    //         //     s3 = new S3(createdComment.id, media.file, 'video');
    //         //     createdComment.video = await s3.UploadVideo();
    //         // }

    //         createdComment.postID = createdComment.id;

    //         createdComment.save();
    //         // TODO: Indicate if the comment is a reply to a post or comment, so a reply for comment isn't scored
    //         redis.zincrby(`circlePost:${commentObject.circleID}`, 1, commentObject.parentPost);

    //     } catch (error) {
    //         logger.error(error);
    //         throw new Error(error);
    //     }
    // }

    public static async TopPosts(userID: string, redis: IORedis.Redis) {
        const lastVisitedCircles = await redis.zrevrange(`visitedCircles:${userID}`, 0, -1);
        const pipeline = redis.pipeline();
        lastVisitedCircles.forEach(circleID => {
            pipeline.zrevrange(`circlePost:${circleID}`, 0, 10, 'WITHSCORES');
        });
        const circlePosts = await pipeline.exec();

        // Filter response from redis pipleline, remove error notification content,
        const filtered = Utility.filterRedisPipeline(circlePosts);

        // Filter further and sort posts and scores into an array of objects
        const grouped = [];

        // Check if filtered and filtered[0] exist before processing
        if (filtered && filtered[0] && filtered[0].length > 0) {
            for (let i = 0; i < filtered[0].length; i++) {
                const currentElement = filtered[0][i];
                const nextElement = filtered[0][i + 1];

                if (isNaN(currentElement / 2)) {
                    grouped.push({
                        circlePostID: mongoose.Types.ObjectId(currentElement),
                        score: parseInt(nextElement, 10),
                    });
                }
            }
        }

        // Sort posts by score
        const sorted = sort(grouped, 'score', {reverse: true});
        // Pick first 8 posts
        const picked = sorted.slice(0, 8);
        const postIDs = picked.map(value => value.circlePostID);

        // Hydrate posts with their content
        const hydratedPosts = await AggregationQueries.CirclePostsAggreg(userID, postIDs);

        return { top: hydratedPosts};
    }

    public static async Delete(userID: string, postID: string) {
        try {
            // TODO: Might want to check if the person deleteing is the author of the post
            CirclePostModel.findByIdAndRemove(postID).exec();
        } catch (err) {
            logger.error(err);
        }
    }

        // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}
