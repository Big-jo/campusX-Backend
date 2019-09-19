import { Router, Response, Request } from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { logger } from '../../shared/Logger';
import { GetPosts, LikePost, GetCampusPosts } from '../../lib/post';
const router = Router();
const path = '/post';

/*******************************************************
 *              Create New Post
 *********************************************************/
export const createPostPath = '/create';
// TODO: Remove exported error messages in other routes;
router.post(createPostPath, async (req: Request, res: Response) => {
    // TODO: Move to post lib .
    // Add option for annonymous posts.
    try {
        // TODO: Move this to lib dir
        // TODO: Add Annonymous feature
        const post = await new PostModel({
            author: req.body.userID,
            post: req.body.post,
            createdAt: moment().format('MMM Do YYYY h:mm:ss a'),
        });

        post.save();
        res.status(CREATED).json({
            success: 'Posted',
        });
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }

});

/*******************************************************
 *              Get Posts
 *********************************************************/
export const getPostsPath = '/getposts/:key/:id';

// tslint:disable-next-line: no-shadowed-variable
router.get(getPostsPath, async (req: Request, res: Response) => {
    try {
        const posts = await GetPosts(req, res, {sortOptions: {mostRecent: true} });
        res.status(OK).json({
            posts,
        });
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured getting your posts',
        });
    }
});

/*********************************************************
 *              Get Posts From A Campus
 *********************************************************/
export const getCampusPostPath = '/getposts/:campusID';

router.get(getCampusPostPath, async (req: Request, res: Response) => {
    try {
        const posts = await GetCampusPosts(req, res);
        res.status(OK).json({
            posts,
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
});

/*********************************************************
 *              Like Post
 *********************************************************/

export const likePostPath = '/like';

router.post(likePostPath, async (req: Request, res: Response) => {
    try {
        LikePost(req, res); 
        res.status(OK).json({
            success: 'Liked',
        });
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops Couldn/t like this post',
        });
    }
});

export default { router, path };
