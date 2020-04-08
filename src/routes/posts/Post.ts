import {Router, Response, Request} from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import {CREATED, INTERNAL_SERVER_ERROR, OK} from 'http-status-codes';
import {logger} from '../../shared/Logger';
import {GetPosts, LikePost, GetCampusPosts, DislikePost, TrashPost} from '../../controllers/post';
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
    // TODO: Add option for anonymous posts.
    try {
        // TODO: Move this to controller dir
        // TODO: Add Annonymous feature
        const post = await new PostModel({
            author: req.token.user._id,
            text: req.body.text,
            video: req.body.video,
            image: req.body.image,
            createdAt: moment().format('lll'),
        });

        await post.save();
        res.status(CREATED).json({
            success: 'Posted',
        });
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occurred',
        });
    }
});

/*********************************************************
 *                      Create Comments
 *********************************************************/
export const createComment = '/comment';
router.post(createComment, auth, async (req: Request, res: Response) => {
    try {
        const comment = {
            author: req.token.user._id,
            text: req.body.comment,
            video: req.body.video,
            image: req.body.image,
            createdAt: moment().format('lll'),
        };
        await PostModel.findByIdAndUpdate(req.body.PostID, {$push: {comments: comment}}).exec();

        res.status(CREATED).json({
            success: 'Comment successful',
        });
    } catch (e) {
        logger.error(e);
        res.status(INTERNAL_SERVER_ERROR).json({
            error: 'Oops an error just occurred',
        });
    }
});

/*********************************************************
 *                      Get Comments
 *********************************************************/
export const getCommentsPath = '/comments/:postID';

router.get(getCommentsPath, auth, async (req: Request, res: Response) => {
    try {
        // Actually, just return post with comments sub-field
        const post = await PostModel.findById(req.params.postID)
            .populate([{
                path: 'author ',
                select: {name: 1, userProfile: 1, userTag: 1},
            }, {
                path: 'comments.author',
                select: {name: 1, userProfile: 1, userTag: 1},
            }]).exec();
        // TODO: Rank comments
        res.status(OK).json({
            post,
        });
    } catch (e) {
        logger.error(e);
        res.status(INTERNAL_SERVER_ERROR).json({
            error: 'Oops an error just occurred',
        });
    }
});
/*********************************************************
 *                          Get Posts
 *********************************************************/
export const getPostsPath = '/getposts/:key/:id';

// tslint:disable-next-line: no-shadowed-variable
router.get(getPostsPath, auth, async (req: Request, res: Response) => {
    try {
        const posts = await GetPosts(req, res, {sortOptions: {mostRecent: true}});
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

router.post(likePostPath, auth, async (req: Request, res: Response) => {
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
router.post(dislikePostPath, auth, async (req: Request, res: Response) => {
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
router.post(trashPostPath, auth, async (req: Request, res: Response) => {
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
export default {router, path};
