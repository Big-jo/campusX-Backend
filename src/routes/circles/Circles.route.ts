import {BAD_REQUEST, CREATED, OK} from 'http-status-codes';
import {Request, Response, Router} from 'express';

import {Circle} from '../../entities/Circles/Circle';
import {CirclePost} from '../../entities/Circles/CirclePost';
import IORedis from 'ioredis';
import {Utility} from '../../lib/utility';
import {logger} from '../../shared/Logger';
import validation from '../../middleware/auth';
import multer from 'multer';
import {ICircle} from '../../interfaces/ICircle';
import * as request from 'request';

/******************************************************************************
 *                                 Router Setup
 /******************************************************************************/

const router = Router();
const path = '/circles';
const auth = validation.validateToken;
const storage = multer.memoryStorage();
const upload = multer({storage});
let client: IORedis.Redis;
/******************************************************************************
 *                                 SETUP REDIS
 /******************************************************************************/
if (process.env.NODE_ENV === 'development') {
    client = new IORedis();
} else {
    const redisPort = Number(process.env.REDIS_PORT_PRIMARY);
    client = new IORedis(redisPort, process.env.REDIS_HOST_PRIMARY, {password: process.env.REDIS_PASS_PRIMARY});
}
client.on('connect', args => {
    logger.info('Redis Connected');
});

client.on('error', err => {
    logger.error(err.message);
});
/******************************************************************************
 *
 /******************************************************************************/

export const createCircle = '/create';
router.post(createCircle, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const circleObject = {
            avatar: req.file,
            name: req.body.name,
            description: req.body.description,
        } as ICircle;

        const result = await Circle.Create(circleObject);
        if (result === 0) {
            res.status(CREATED).json('created');
        } else {
            res.status(BAD_REQUEST).json({exist: true});
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
            res.status(OK).json({memberID: result.memberID});
        } else {
            res.status(BAD_REQUEST).json({exist: true});
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
    if (result === 0) {
        res.status(OK).send();
    }
});

/******************************************************************************
 *                                 GET CIRCLE FEED
 /******************************************************************************/

export const circleFeed = '/feed';
router.get(circleFeed, auth, async (req: Request, res: Response) => {
    try {
        const result = await Circle.GetCircleFeed(req.body.circleID, client);
        res.status(OK).json({circleFeed: result.circleFeed});
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
        const post = {
            author: req.token,
            memberID: req.body.memberID,
            name: req.body.name,
            circleID: req.body.circleID,
            text: req.body.text,
            userTag: req.body.userTag,
        };

        const media =  (req.file.fieldname === 'image') ? {tag: 'image', file: req.file} : {tag: 'video', file: req.file};
        const result = await CirclePost.CirclePost(post, media, client, post.circleID, post.memberID);

        if (result === 0) {
            res.status(CREATED).send();
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 GET CIRCLES
 /******************************************************************************/
export const getCircles = '/list';
router.get(getCircles, async (req: Request, res: Response) => {
    try {
        const result = await Circle.GetCircles(parseInt(req.query.offset, 10));
        res.status(OK).json({result});
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
        const result = await Circle.GetCircle(req.params.circleID, req.token.userID); 

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

export default {router, path};
