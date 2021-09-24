import { BAD_REQUEST, CREATED, OK } from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { Circle } from '../../entities/Circles/Circle';
import { CirclePost } from '../../entities/Circles/CirclePost';
import IORedis from 'ioredis';
import { Utility } from '@lib';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import multer from 'multer';
import { ICircle } from '@interfaces';
import { ICirclePost, ICircleComment } from '@interfaces';

/******************************************************************************
 *                                 Router Setup
 /******************************************************************************/

const router = Router();
const path = '/circles';
const auth = validation.validateToken;
const storage = multer.memoryStorage();
const upload = multer({ storage });

/******************************************************************************
 *
 /******************************************************************************/

export const createCircle = '/create';
const multerUploadConfig = [{
    name: 'avatar',
    maxCount: 1,
}, {
    name: 'coverImage',
    maxCount: 1,
}];

router.post(createCircle, auth, upload.fields(multerUploadConfig), async (req: Request, res: Response) => {
    try {
        //
        const circleObject = {
            // @ts-ignore
            avatar: req.files.avatar[0],
            // @ts-ignore
            coverImage: req.files.coverImage[0],
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
        } as ICircle;

        const result = await Circle.Create(circleObject, req.token.userID);
        if (!result.exist) {
            res.status(CREATED).json(result);
        } else {
            res.status(BAD_REQUEST).json({ exist: true });
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

export const joinCircle = '/join';
router.post(joinCircle, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.Join(req.token.userID, req.body.circleID);
        if (result.exist !== true) {
            res.status(OK).json({ memberID: result.memberID });
        } else {
            res.status(BAD_REQUEST).json({ exist: true });
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 Leave Circle
 /******************************************************************************/

export const leaveCircle = '/leave';
router.post(leaveCircle, auth, async (req: Request, res: Response) => {
    const result = await Circle.Leave(req.body.circleID, req.token.userID);
    if (result) {
        res.status(BAD_REQUEST).json({ result });
    } else {
        res.status(OK).send();
    }
});

/******************************************************************************
 *                                 GET CIRCLE FEED
 /******************************************************************************/

export const circleFeed = '/feed/:circleID';
router.get(circleFeed, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.GetCircleFeed(req.params.circleID, req.token.userID,
            req.query.page, req.query.limit);

        res.status(OK).json({ circleFeed: result.circleFeed });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 POST TO A CIRCLE
 /******************************************************************************/

export const circlePost = '/post';
router.post(circlePost, upload.single('image'), auth, async (req: Request, res: Response) => {
    try {
        const post: ICirclePost = {
            author: req.token.userID,
            memberID: req.body.memberID,
            circleID: req.body.circleID,
            text: req.body.text,
            campus: req.token.campus,
            parentPost: req.body.parentPost,
        };

        // tslint:disable-next-line: max-line-length
        const media = (req.file !== undefined) ? ((req.file.fieldname === 'image') ? { tag: 'image', file: req.file } : { tag: 'video', file: req.file }) : undefined;
        const result = await CirclePost.CirclePost(post, media, res.locals.primaryCache);

        if (result.msg !== undefined) {
            res.status(CREATED).send();
        } else {
            res.status(403).json({err: result.msg});
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 GET CIRCLES
 /******************************************************************************/
export const getCircles = '/list';
router.get(getCircles, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.GetCircles(parseInt(req.query.offset, 10),  req.token.userID,
            req.query.recent, res.locals.primaryCache, req.query.category);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 GET CIRCLE
/******************************************************************************/
export const getCircle = '/circle/:circleID';
router.get(getCircle, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.GetCircle(req.params.circleID, req.token.userID, res.locals.primaryCache);

        res.status(OK).json(result);
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 GET USER CIRCLES
/******************************************************************************/

export const userCircles = '/home';
router.get(userCircles, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.UserCircles(req.token.userID);
        res.status(OK).json(result);
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 Comment On A Cirlce's Post
/******************************************************************************/
export const comment = '/post/comment';
router.post(comment, auth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req: Request, res: Response) => {
    try {
        // Resolve file if any
        // @ts-ignore
        // const media = req.files.image !== undefined ?
        //     // @ts-ignore
        //     {type: 'image', file: req.files.image[0]} : {type: 'video', file: req.files.video[0]}

        const commentObject: ICircleComment = {
            campus: req.token.campus,
            circleID: req.body.circleID,
            memberID: req.body.memberID,
            parentPost: req.body.parentPost,
            author: req.token.userID,
            text: req.body.text,
        };

        // if()
        CirclePost.CircleComment(commentObject, undefined, res.locals.primaryCache);

        res.status(OK).send();
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 LIKE A POST
/******************************************************************************/
export const like = '/post/like';
router.post(like, auth, async (req: Request, res: Response) => {
    try {
        const result = await CirclePost.LikePost(req.token.userID, req.body.postID, 'post', res.locals.primaryCache,
            req.body.circleID);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                      GET TOP CIRCLE POSTS
 /******************************************************************************/
export const top = '/post/top';
router.get(top, auth, async (req: Request, res: Response) => {
    try {
        const result = await CirclePost.TopPosts(req.token.userID, res.locals.primaryCache);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 Like A Comment
/******************************************************************************/
// export const likeComment = '/comment/like';
// router.post(likeComment, auth, async (req: Request, res: Response) => {
//     try {
//         const result = await CirclePost.LikePost(req.token.userID, req.body.postID, 'comment');
//         res.status(OK).json({ result });
//     } catch (error) {
//         Utility.ErrResponse(res, error);
//     }
// });

export default { router, path };
