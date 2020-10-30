import { Post } from '../Post';
import CircleCirclePostModel from '../../models/CirclePost.model';
import { ICirclePost, ICircleComment } from '../../interfaces/ICirclePost';
import {logger} from '@shared';
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

// interface ICPost {

// }

export class CirclePost {

    // constructor() {}

    // tslint:disable-next-line: max-line-length
    public static async CirclePost(circlePost: ICirclePost, media: any, redisClient: IORedis.Redis, circleID: string) {
        try {
            const isMember = await CircleMemberModel.findById(circlePost.memberID).lean().exec();
            if (isMember !== null) {
                const CPost: ICirclePost = {
                    circleID: circlePost.circleID,
                    memberID: circlePost.memberID,
                    text: circlePost.text,
                    name: circlePost.name,
                    userTag: circlePost.userTag,
                    video: '',
                    image: '',
                    author: circlePost.author,
                    authorAvatar: circlePost.authorAvatar,
                    campus: circlePost.campus,
                    parentPost: circlePost.parentPost,
                };

                const post = new CirclePostModel(CPost);

                CPost.postID = post.id;

                if (media !== undefined) {
                    const s3 = new S3(post.id, media.file, 'image');

                    media.tag === 'image' ? post.image = await s3.UploadImage() as string : post.video = await s3.UploadImage() as string;
                }

                await post.save();

                const pipeline = redisClient.pipeline();

                const expireTime = process.env.CIRCLEPOST_EXPIRE_TIME as unknown as number;

                pipeline.hmset(`${post.id}`, CPost);
                pipeline.expire(`${post.id}`, expireTime);
                pipeline.sadd(`circlePostsIndexes:${circleID}`, `${circleID}:${post.id}`);

                pipeline.exec();

                return 0;
            } else {
                return { error: 'Sorry cannot post if you are not a member' };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async LikeCirclePost(userID: string, postID: string, postCache: IORedis.Redis, collection: string, parentPostID?: string) {
        try {
            const likedBy = await LikedByModel.find({ postID, userID }).exec();
            const isInCache = await postCache.exists(postID);
            if ((likedBy.length === 0) && (isInCache === 1)) {
                switch (collection) {
                    case 'post':
                        PostModel.findByIdAndUpdate(postID, { $inc: { likes: 1 }, likedBy: userID }).exec();
                        UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();

                        // @ts-ignore
                        new LikedByModel({
                            postID,
                            userID,
                        }).save();

                        const postPipeline = postCache.pipeline();

                        postPipeline.hincrby(postID, 'likes', 1);
                        postPipeline.sadd(`likes:${postID}`, userID);
                        postPipeline.expire(`likes:${postID}`, process.env.POST_EXPIRE_TIME as unknown as number);
                        postPipeline.exec();
                        return { ops: 'liked' };

                    case 'comment':
                        CommentModel.findByIdAndUpdate(postID, { $inc: { likes: 1 }, likedBy: userID }).exec();
                        UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();

                        // @ts-ignore
                        new LikedByModel({
                            postID,
                            userID,
                        }).save();

                        const commentPipeline = postCache.pipeline();

                        commentPipeline.hincrby(postID, 'likes', 1);
                        commentPipeline.sadd(`likes:${postID}`, userID);
                        commentPipeline.zincrby(`post_comments_index:${parentPostID}`, 1, postID);
                        commentPipeline.expire(`likes:${postID}`, process.env.POST_EXPIRE_TIME as unknown as number);
                        commentPipeline.exec();

                        return { ops: 'liked' };
                    default:
                        return;
                }
            } else {

                switch (collection) {
                    case 'post':
                        PostModel.findByIdAndUpdate(postID, { $inc: { likes: -1 }, likedBy: userID }).exec();
                        UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': -0.25 } }).exec();
                        LikedByModel.deleteOne({ postID, userID }).exec();

                        if (isInCache === 1) {
                            const postPipeline = postCache.pipeline();
                            postPipeline.hincrby(postID, 'likes', -1);
                            postPipeline.srem(`likes:${postID}`, userID);
                            postPipeline.exec();
                        }

                        return { ops: 'unliked' };

                    case 'comment':
                        CommentModel.findByIdAndUpdate(postID, { $inc: { likes: -1 }, likedBy: userID }).exec();
                        UserModel.findByIdAndUpdate(userID, { $inc: { 'userProfile.rep_points': -0.25 } }).exec();
                        LikedByModel.deleteOne({ postID, userID }).exec();

                        if (isInCache === 1) {
                            const commentPipeline = postCache.pipeline();
                            commentPipeline.hincrby(postID, 'likes', -1);
                            commentPipeline.zincrby(`post_comments_index:${parentPostID}`, -1, postID);
                            commentPipeline.srem(`likes:${postID}`, userID);
                            commentPipeline.exec();
                        }

                        return { ops: 'unliked' };
                }
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Comment(commentObject: ICircleComment, postCache: IORedis.Redis, media: any) {
        try {
            const comment = {
                authorAvatar: commentObject.authorAvatar,
                campus: commentObject.campus,
                parentPost: commentObject.parentPost,
                userTag: commentObject.userTag,
                createdAt: moment().valueOf(),
                author: commentObject.author,
                comments: 0,
                dislikes: 0,
                image: commentObject.image,
                likes: 0,
                name: commentObject.name,
                text: commentObject.text,
                video: commentObject.video,
                circleID: commentObject.circleID,
                memberID: commentObject.memberID,
            };

            const savedComment =  new CircleCommentModel(comment);

            savedComment.postID = savedComment.id; 
            
            savedComment.save();

            if (media !== undefined) {
                const s3 = new S3(savedComment.id, media.file, 'image');

                media.tag === 'image' ? savedComment.image = await s3.UploadImage() as string : savedComment.video = await s3.UploadImage() as string;
            }

            const expireTime = process.env.CIRCLEPOST_EXPIRE_TIME as unknown as number;
            const pipeline = postCache.pipeline();

            pipeline.hmset(savedComment.id, commentObject);
            pipeline.hincrby(commentObject.parentPost, 'comments', 1);
            pipeline.expire(savedComment.id, expireTime);
            pipeline.zadd(`circle_comments:${comment.circleID}:${comment.parentPost}`, '0', savedComment.id);
            pipeline.expire(`circle_comments:${comment.circleID}:${comment.parentPost}`, expireTime);

            pipeline.exec();
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
    // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}
