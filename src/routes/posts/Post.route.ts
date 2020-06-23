import { Router, Response, Request } from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import { Post } from '../../entities/Post';
import {IComment, IPost} from '../../interfaces/IPost';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';

import {Newsfeed} from '../../lib/newsfeeds';

const router = Router();
const path = '/post';

const auth = validation.validateToken;
let client: IORedis.Redis;
/******************************************************************************
 *                                 SETUP REDIS
 /******************************************************************************/

if (process.env.NODE_ENV === 'development') {
     client = new IORedis();
} else {
    const redisPort = Number(process.env.REDIS_PORT);
    client = new IORedis(redisPort, process.env.REDIS_HOST, {password: process.env.REDIS_PASS});
}

client.on('connect', args => {
    logger.info('Redis Connected');
});

client.on('error', err => {
    logger.error(err);
});

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
        const post: IPost = {
            userTag: req.body.userTag,
            author: req.token.userID,
            image: req.body.image,
            text: req.body.text,
            video: req.body.video,
            campus: req.body.campus,
            name: req.body.name,
        };
        // const result = await Post.CreatePost(post, req.token.userID, client, req.body.options, io);
        const io = res.locals.socketio;
        const newsfeed = new Newsfeed(io);
        const options = req.body.options;
        const result = await newsfeed.ConstructNewsFeed(post, req.token.userID, {anonymous: options.anon});
        // tslint:disable-next-line: max-line-length
        result === 0 ? res.status(CREATED).send() : res.status(BAD_REQUEST).json({error: 'Sorry, error in the details your details'});

    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/*********************************************************
 *                      Create Comments
 *********************************************************/
export const createComment = '/comment';
router.post(createComment, auth, async (req: Request, res: Response) => {
    try {
        const commentObject: IComment = {
            video: req.body.video,
            image: req.body.image,
            text: req.body.text,
            author: req.body.author,
            userTag: req.body.userTag,
            parentPost: req.body.parentPost,
            campus: req.token.userProfile.university,
        };
        const result = await Post.Comment(commentObject);
        result === 0 ? res.status(CREATED).send() : res.status(BAD_REQUEST).send();
    } catch (e) {
        logger.error(e);
        Utility.ErrResponse(res, e);
    }
});

/*********************************************************
 *                      Get Comments
 *********************************************************/
export const getCommentsPath = '/comments/:postID';

router.get(getCommentsPath, auth, async (req: Request, res: Response) => {
    try {
        // Actually, just return post with comments sub-field
        const result = await Post.GetComments(req.params.postID);
        res.status(OK).json({result});
        // TODO: Rank comments
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});
/*********************************************************
 *                          Get Posts
 *********************************************************/
export const getPostsPath = '/newsfeed/home/:userID';

// tslint:disable-next-line: no-shadowed-variable
router.get(getPostsPath, async (req, res) => {
    try {
        // await Post.GetPosts(client, req.params.userID, {mostRecent: true});
        // const result = await Post.GetPosts(client, req.token.userID, {mostRecent: true});
        const io = res.locals.io;
        const newsfeed = new Newsfeed(io);
        res.status(200);
    } catch (error) {
        logger.error(error, error.message);
        Utility.ErrResponse(res, error);
    }
});

/*********************************************************
 *              Get Posts From A Campus
 *********************************************************/
export const getCampusPostPath = '/getnewsfeed/:campusID';

// router.get(getCampusPostPath, async (req: Request, res: Response) => {
//     try {
//         const posts = await GetCampusPosts(req, res);
//         res.status(OK).json({
//             posts,
//         });
//     } catch (error) {
//         res.status(INTERNAL_SERVER_ERROR).json({
//             err: 'Oops an error occured',
//         });
//     }
// });

/*********************************************************
 *              Like Post
 *********************************************************/

export const likePostPath = '/like';

router.post(likePostPath, auth, async (req: Request, res: Response) => {
    try {
        const result = await Post.LikePost(req.token.userID, req.body.postID);
        result === 0 ? res.status(200).send() : res.status(BAD_REQUEST).send();
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 Dislike Post
 /******************************************************************************/
export const dislikePostPath = '/dislike';
router.post(dislikePostPath, auth, async (req: Request, res: Response) => {
    try {
        const result = await Post.DislikePost(req.token.userID, req.body.postID);
        result === 0 ? res.status(200).send() : res.status(BAD_REQUEST).send();
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 Trash Post
 /******************************************************************************/
// export const trashPostPath = '/trash';
// router.post(trashPostPath, auth, async (req: Request, res: Response) => {
//     try {
//         // const result = await Post.Tra(req.token.userID, req.body.postID);
//         // result === 0 ? res.status(200) : res.status(BAD_REQUEST);
//     } catch (error) {
//         res.status(INTERNAL_SERVER_ERROR).json({
//             err: 'Oops an error occured',
//         });
//     }
// });

export default { router, path };
