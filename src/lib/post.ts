import { Request, Response } from 'express';
import PostModel from '../models/Post.model';
import FollowingModel from '../models/Following.model';
import UserModel from '../models/User.model';
import { IPost } from 'src/interfaces/IPost';
import { logger } from '../shared/Logger';
import { IUserProfile } from 'src/interfaces/IUser';

interface IOptions {
    sortOptions: {
        first_100?: boolean, // Returns first 100
        all?: boolean, // Releases the whole wave, good luck
        mostRecent?: boolean, // Limits result to 20
        // TODO: create a more efficient retrival method
    };
}

export async function GetPosts(req: Request, res: Response, options: IOptions): Promise<IPost[]> {
   if (options.sortOptions.mostRecent === true) {
    try {
        /*
        * Get recent posts from all followings
        */

        // Get followings
        // const followings = await FollowingModel.find({follower: req.params.id}).exec();
        const followings = await FollowingModel.find({follower: req.params.id}, {target: 1}).lean().exec();
        const targetObjectIDs: string[] = [];
        for (const following of followings) {
            targetObjectIDs.push(following.target);
        }
        // Get post from each following
        const posts = await PostModel.find({author: {$in: targetObjectIDs}})
            .populate({path: 'author', select: {name: 1, userProfile: 1}})
            .exec();
        return posts;
    } catch (error) {
        return error;
    }

   } else {
    try {
        /*
        * Get recent posts from all followings
        */

        // Get followings
        const followings = await FollowingModel.find({follower: req.params.id}).exec();
        // Get post from each following
        const posts = await PostModel.find({_id: {$in: followings}}).exec();

        return posts;
    } catch (error) {
        return error;
    }
   }
}

export async function LikePost(req: Request, res: Response) {
    try {
        PostModel.findByIdAndUpdate(req.body.id, {$inc: {likes: 1}});
        UserModel.findByIdAndUpdate(req.body.id, {$inc: {'userProfile.rep_points': 0.25}});
    } catch (error) {
        return error;
    }
}
