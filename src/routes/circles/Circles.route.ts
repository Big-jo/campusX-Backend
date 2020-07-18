import { BAD_REQUEST, CREATED, OK } from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { Circle } from '../../entities/Circles/Circle';
import { CirclePost } from '../../entities/Circles/CirclePost';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import validation from '../../middleware/auth';
import multer from 'multer';
import {ICircle} from '../../interfaces/ICircle';

/******************************************************************************
*                                 Router Setup
/******************************************************************************/

const router = Router();
const path = '/circles';
const auth = validation.validateToken;
const storage = multer.memoryStorage();
const upload = multer({ storage });
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
    logger.error(err.message);
 });
/******************************************************************************
*                                 
/******************************************************************************/

export const createCircle = '/create';
router.post(createCircle, upload.single('image'), async (req: Request, res: Response) => {
    try {
        req.body.circleObject = JSON.parse(req.body.circleObject);
        const circleObject: ICircle = {
            avatar: req.file,
            name: req.body.circleObject.name,
            description: req.body.circleObject.description,
        };
        const result = await Circle.Create(circleObject);
        if (result === 0) {
            res.status(CREATED).json('created');
        } else {
            res.status(BAD_REQUEST).json({ exist: true});
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
router.post(circlePost, async (req: Request, res: Response) => {
    try {
        const result = await CirclePost.CirclePost(req.body.post, client, req.body.circleID, req.body.memberID);
        if (result === 0) {
            res.status(CREATED);
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
        const result = await Circle.GetCircles();
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});
export default { router, path };
