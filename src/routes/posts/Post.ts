import { Router, Response, Request } from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { logger } from '../../shared/Logger';
import { GetPosts, LikePost, GetCampusPosts, DislikePost, TrashPost } from '../../controllers/post';
import validation from '../../middleware/auth';
const router = Router();
const path = '/post';

const auth = validation.validateToken;
/*******************************************************
 *              Create New Post
 *********************************************************/
export const createPostPath = '/create';
// TODO: Remove exported error messages in other routes;
router.post(createPostPath, auth, async (req: Request, res: Response) => {
    // TODO: Move to post lib .
    // Add option for annonymous posts.
    try {
        // TODO: Move this to lib dir
        // TODO: Add Annonymous feature
        const post = await new PostModel({
            author: req.token.user._id,
            text: req.body.text,
            video: req.body.video,
            image: req.body.image,
            createdAt: moment().format('lll'),
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

/*********************************************************
 *                          Get Posts
 *********************************************************/
export const getPostsPath = '/getposts/:key/:id';

// tslint:disable-next-line: no-shadowed-variable
router.get(getPostsPath, async (req: Request, res: Response) => {
    try {
        const posts = await GetPosts(req, res, { sortOptions: { mostRecent: true } });
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

/******************************************************************************
*                                 Dislike Post
/******************************************************************************/
export const dislikePostPath = '/dislike';
router.post(dislikePostPath, async (req: Request, res: Response) => {
    try {
        DislikePost(req, res);
        res.status(OK).json({
            success: 'Disliked',
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
});

/******************************************************************************
*                                 Trash Post
/******************************************************************************/
export const trashPostPath = '/trash';
router.post(trashPostPath, async (req: Request, res: Response) => {
    try {
        TrashPost(req, res);
        res.status(OK).json({
            success: 'Trashed',
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
})
export default { router, path };
