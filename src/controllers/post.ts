import { Request, Response } from 'express';
import PostModel from '../models/Post.model';
import FollowingModel from '../models/Following.model';
import UserModel from '../models/User.model';
import { IPost } from 'src/interfaces/IPost';
import { logger } from '../shared/Logger';
import { IUserProfile } from 'src/interfaces/IUser';
import sort from 'array-sort';
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
        //  To get self-post, key is set to 0, to get others key is set to 1
        switch (req.params.key) {
            case '0':
                try {
                    const posts = await PostModel.find({ author: req.params.id })
                        .populate({ path: 'author', select: { name: 1, userProfile: 1, userTag: 1} })
                        .exec();
                    return posts.reverse();
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
                    let posts = await PostModel.find({ author: { $in: targetObjectIDs } })
                        .populate({ path: 'author', select: { name: 1, userProfile: 1, userTag: 1    } })
                        .exec();
                    // Sort posts by date and time
                    posts = await sort(posts, (a: IPost, b: IPost) => {
                        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
                    }, { reverse: true });
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
 * PIS - POST INTERACTION SCORE
 */
interface IScoredPost {
    post: IPost;
    PIS: number;
}

/**
 * Searches for users in a particular campus and then searches for their posts, would be really expensive,
 * the solution would be to cache the universities and their users.
 */
export async function GetCampusPosts(req: Request, res: Response) {
    try {
        const users = await UserModel.find({ 'userProfile.university': req.params.campusID });
        let posts: IScoredPost[] = [];

        for (const user of users) {
            const Posts = await PostModel.find({ author: user._id })
                .populate({ path: 'author', select: { name: 1, userProfile: 1 } }).exec();
            for (const post of Posts) {
                const scoredPost: IScoredPost = { post, PIS: post.scorePost() };
                posts.push(scoredPost);
            }
        }
        // Sort post in order of reducing PIS
        posts = sort(posts, 'PIS', { reverse: true });
        return posts;
    } catch (error) {
        return error;
    }
}

export async function LikePost(req: Request, res: Response) {
    try {
        PostModel.findByIdAndUpdate(req.body.postID, { $inc: { likes: 1 }, likedBy: req.params.userID }).exec();
        UserModel.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();
    } catch (error) {
        return error;
    }
}

export async function DislikePost(req: Request, res: Response) {
    try {
        PostModel.findByIdAndUpdate(req.body.postID, { $inc: { dislikes: 1 } }).exec();
        UserModel.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.13 } }).exec();
    } catch (error) {
        return error;
    }
}

export async function TrashPost(req: Request, res: Response) {
    try {
        PostModel.findByIdAndUpdate(req.body.postID, { $inc: { trash: 1 } }).exec();
        UserModel.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.9 } }).exec();
    } catch (error) {
        return error;
    }
}
