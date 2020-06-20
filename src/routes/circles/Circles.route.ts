import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { Request, Response, Router, response } from 'express';

import { Circle } from '../../entities/Circles/Circle';
import { CirclePost } from '../../entities/Circles/CirclePost';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import validation from '../../middleware/auth';

/******************************************************************************
*                                 Router Setup
/******************************************************************************/

const router = Router();
const path = '/circles';
const auth = validation.validateToken;
const redisPort = Number(process.env.REDIS_PORT);
const client = new IORedis(redisPort, process.env.REDIS_HOST, {password: process.env.REDIS_PASS});
 /* Set Up Redis */
client.on('connect', () => {
    logger.log('info', 'connected');
});

client.on('error', err => {
    // console.error(err);
    logger.error(err);
});
/******************************************************************************
*                                 
/******************************************************************************/

export const createCircle = '/create';
router.post(createCircle, async (req: Request, res: Response) => {
    try {
        const result = await Circle.Create(req.body);
        if (result === 0) {
            res.status(CREATED).json('created');
        } else {
            res.status(BAD_REQUEST).json({ exist: true});
        }
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

export const joinCircle = '/join';
router.post(joinCircle, async (req: Request, res: Response) => {
    try {
        const result = await Circle.Join(req.token.userID, req.body.circleID);
        if (result.exist !== true) {
            res.status(OK).json({memberID: result.memberID});
        } else {
            res.status(BAD_REQUEST).json({exist: true});
        }
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                                 Leave Circle
/******************************************************************************/

export const leaveCircle = '/leave';
router.post(leaveCircle, async (req: Request, res: Response) => {
    const result = await Circle.Leave(req.body.circleID, req.token.userID);
    if (result === 0) {
        res.status(OK);
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
        Utility.ErrResponse(res);
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
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                                 GET CIRCLES
/******************************************************************************/
export const getCircles = '/list';
router.get(getCircles, async (req: Request, res: Response) => {
    try {
        const result = Circle.GetCircles();
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res);
    }
})
export default { router, path };
