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

export async function GetPosts(req: Request, res: Response, options: IOptions) {
    if (options.sortOptions.mostRecent === true) {
        //  To get self-post, key is set to 0, to get others key is set to one
        switch (req.params.key) {
            case '0':
                try {
                    const posts = await PostModel.find({ author: req.params.id })
                        .populate({ path: 'author', select: { name: 1, userProfile: 1 } })
                        .exec();
                    return posts;
                } catch (error) {
                    return error;
                }
            case '1':
                try {
                    /*
                    * Get recent posts from all followings
                    */

                    // Get followings
                    // const followings = await FollowingModel.find({follower: req.params.id}).exec();
                    // tslint:disable-next-line: max-line-length
                    const followings = await FollowingModel.find({ follower: req.params.id }, { target: 1 }).lean().exec();
                    const targetObjectIDs: string[] = [];
                    for (const following of followings) {
                        targetObjectIDs.push(following.target);
                    }
                    // Get post from each following
                    const posts = await PostModel.find({ author: { $in: targetObjectIDs } })
                        .populate({ path: 'author', select: { name: 1, userProfile: 1 } })
                        .exec();
                    return posts;
                } catch (error) {
                    return error;
                }
            default:
                return new Error('Sorry, unrecognizable key');
        }
    }
}

/**
 * Searches for users in a particular campus and then searches for their posts, would be really expensive,
 * the solution would be to cache the universities and their users.
 */
export async function GetCampusPosts(req: Request, res: Response) {
    try {
        const users = await UserModel.find({'userProfile.university': req.params.campusID});
        const posts = [];
        for (const user of users) {
           posts.push(await PostModel.find({author: user._id}));
        }
        return posts;
    } catch (error) {
        return error;
    }
}

export async function LikePost(req: Request, res: Response) {
    try {
        PostModel.findByIdAndUpdate(req.body.id, { $inc: { likes: 1 } });
        UserModel.findByIdAndUpdate(req.body.id, { $inc: { 'userProfile.rep_points': 0.25 } });
    } catch (error) {
        return error;
    }
}
