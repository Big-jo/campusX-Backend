import { Router, Response, Request } from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import { Post } from '../../entities/Post';
import { IComment, IPost } from '../../interfaces/IPost';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';

// import {Newsfeed} from '../../lib/newsfeeds';
import multer from 'multer';

const router = Router();
const path = '/post';

const storage = multer.memoryStorage();
const upload = multer({ storage });
const auth = validation.validateToken;

let primaryCache: IORedis.Redis;
let postCache: IORedis.Redis;

/******************************************************************************
 *                                 SETUP REDIS
 /******************************************************************************/

if (process.env.NODE_ENV === 'development') {
    primaryCache = new IORedis();
    postCache = new IORedis({ port: 6380 });
} else {
    const redisPortPrimary = Number(process.env.REDIS_PORT_PRIMARY);
    const redisPortPC = Number(process.env.REDIS_PORT_PC);

    primaryCache = new IORedis(redisPortPrimary, process.env.REDIS_HOST_PRIMARY, { password: process.env.REDIS_PASS_PRIMARY });
    postCache = new IORedis(redisPortPC, process.env.REDIS_HOST_PC, { password: process.env.REDIS_PASS_PC });

}

primaryCache.on('connect', args => {
    logger.info('Redis Connected');
});

primaryCache.on('error', err => {
    logger.error(err);
});

/*******************************************************
 *              Create New Post
 *********************************************************/
export const createPostPath = '/create';
// TODO: Remove exported error messages in other routes;
router.post(createPostPath, auth, upload.fields([{name: 'image', maxCount: 1}, {name: 'video', maxCount: 1}]),
    async (req: Request, res: Response) => {
    // TODO: Move to post lib .
    // TODO: Add option for anonymous posts.
    try {
        // TODO: Move this to controller dir
        // TODO: Add Annonymous feature

        const post: IPost = {
            author: req.token.userID,
            // @ts-ignore
            image: req.files.image !== undefined ? req.files.image[0] : '',
            // @ts-ignore
            video: req.files.video !== undefined ? req.files.video[0] : '',
            text: req.body.text,
            campus: req.token.campus,
            name: req.token.name,
            parentPost: req.body.parentPost,
        };

        const options = {
            anonymous: req.body.anon,
        };

        Post.CreatePost(post, req.token.userID, null, primaryCache);

        res.status(OK).send();
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
            postID: '',
            video: req.body.video,
            image: req.body.image,
            text: req.body.text,
            author: req.body.author,
            parentPost: req.body.parentPost,
            campus: req.body.university,
        };

        const result = await Post.Comment(commentObject);
        res.status(CREATED).send();
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
        const result = await Post.GetComments(req.params.postID, req.token.userID, req.query.limit, req.query.page);
        res.status(OK).json({result});
        // TODO: Rank comments
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});
/*********************************************************
 *                          Get Posts
 *********************************************************/
export const getPostsPath = '/newsfeed/home';

// tslint:disable-next-line: no-shadowed-variable
router.get(getPostsPath, auth, async (req, res) => {
    try {
        // await Post.GetPosts(client, req.params.userID, {mostRecent: true});
        const offset = req.query.offset;
        const limit = req.query.limit;
        const result = await Post.GetPosts(primaryCache, postCache, req.token.userID, {
            mostRecent: true,
            offset,
            limit,
        });

        res.status(200).json({result});
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

export const likePostPath = '/like/post';

router.post(likePostPath, auth, async (req: Request, res: Response) => {
    try {

        Post.LikePost(req.token.userID, req.body.postID, 'post');
        res.status(OK).json();
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 LIKE COMMENT
 /******************************************************************************/
const likeComment = '/like/comment';
router.post(likeComment, auth, async (req, res) => {
    try {
        Post.LikePost(req.token.userID, req.body.commentID, 'comment');
        res.status(OK).send();
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});
/******************************************************************************
 *                                 Dislike Post
 /******************************************************************************/
// export const dislikePostPath = '/dislike';
// router.post(dislikePostPath, auth, async (req: Request, res: Response) => {
//     try {
//         const result = await Post.DislikePost(req.token.userID, req.body.postID, postCache);
//         result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).send();
//     } catch (error) {
//         Utility.ErrResponse(res, error);
//     }
// });
//

/******************************************************************************
*                                 Check Newsfeed Status
/******************************************************************************/
export const checkFeedStatus = '/newsfeed/check';
router.get(checkFeedStatus, auth, async (req: Request, res: Response) => {
    try {
        const result = await Post.CheckFeedStatus(req.token.userID, primaryCache);

        res.json({ result }).status(OK);
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
