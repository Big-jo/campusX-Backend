import {Post} from '../Post';
import CircleCirclePostModel from '../../models/CirclePost.model';
import {ICirclePost} from '../../interfaces/ICirclePost';
import {logger} from '../../shared/Logger';
import IORedis from 'ioredis';
import CirclePostModel from '../../models/CirclePost.model';
import {S3} from '../../lib/s3';

export class CirclePost extends Post {

    // constructor() {}

    // tslint:disable-next-line: max-line-length
    public static async CirclePost(circlePost: { text: string, name: string, userTag: string, circleID: string }, media: any, redisClient: IORedis.Redis, circleID: string, memberID: string) {
        try {
            const CPost = {
                circle: circlePost.circleID,
                text: circlePost.text,
                name: circlePost.name,
                userTag: circlePost.userTag,
                video: '',
                image: '',
            };

            const post = new CirclePostModel(CPost);
            const s3 = new S3(post.id, media.file, 'image');

            media.tag === 'image' ? post.image = await s3.UploadImage() as string : post.video = await s3.UploadImage() as string;

            await post.save();

            const serializedPost = JSON.stringify(post);
            await redisClient.hset(circleID, memberID, serializedPost);
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async LikePost(postID: string, userID: string) {
        try {
            /**
             *  Increment Post likes and update the likedBy field
             */
            CirclePostModel.findByIdAndUpdate(postID, {$inc: {likes: 1}, likedBy: userID}).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async DislikePost(postID: string, userID: string) {
        try {
            CirclePostModel.findByIdAndUpdate(postID, {$inc: {dislikes: 1}}).exec();
            return 0;
        } catch (error) {
            throw new Error(error);
        }
    }

    // private static async SortPost(posts: any[], options: { reverse: boolean }): Promise<any[]> {
    //
    // }
}
