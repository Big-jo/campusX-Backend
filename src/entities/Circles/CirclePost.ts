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
import s3Storage from 'multer-s3';
import multer from 'multer';

// interface ICPost {

// }

export class CirclePost extends Post {

    // constructor() {}

    // tslint:disable-next-line: max-line-length
    public static async CirclePost(circlePost: ICirclePost, media: any, redisClient: IORedis.Redis, circleID: string) {
        try {
            const isMember = await CircleMemberModel.findById(circlePost.memberID).lean().exec();
            if (isMember !== null) {
                const CPost: ICirclePost = {
                    circle: circlePost.circle,
                    memberID: circlePost.memberID,
                    text: circlePost.text,
                    name: circlePost.name,
                    video: '',
                    image: '',
                    author: circlePost.author,
                    campus: circlePost.campus,
                    parentPost: circlePost.parentPost,
                };

                const post = new CirclePostModel(CPost);

                CPost.postID = post.id;

                if (media !== undefined) {
                    const s3 = new S3(post.id, media.file, 'image');

                    media.tag === 'image' ? post.image = await s3.UploadImage() as string : post.video = await s3.UploadImage() as string;
                }

                post.save();

                const expireTime = process.env.CIRCLEPOST_EXPIRE_TIME as unknown as number;
                redisClient.zadd(`${circleID}`, '0', post.id);
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

        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Comment(commentObject: ICircleComment, media: {type: string, file: any }) {
        try {
            const comment: ICircleComment = {
                campus: commentObject.campus,
                parentPost: commentObject.parentPost,
                createdAt: moment().valueOf(),
                author: commentObject.author,
                comments: 0,
                dislikes: 0,
                image: commentObject.image,
                likes: 0,
                text: commentObject.text,
                video: commentObject.video,
                circle: commentObject.circle,
                memberID: commentObject.memberID,
            };

            const createdComment =  new CircleCommentModel(comment);

            let s3;

            if (media.type === 'image') {
               s3  = new S3(createdComment.id, media.file, 'image');
               createdComment.image = await s3.UploadImage();
            } else {
                s3  = new S3(createdComment.id, media.file, 'video');
                createdComment.video = await s3.UploadVideo();
            }

            createdComment.postID = createdComment.id; 

            createdComment.save();

        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
    // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}

