import { Router, Response, Request, response } from 'express';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { errMessage } from '../users/Users.route';
import { Store } from '../../entities/Store/Store';
import { Circle } from '../../entities/Circles/Circle';
import { Utility } from '../../lib/utility';
import IORedis from 'ioredis';
import { logger } from 'src/shared/Logger';
import { CirclePost } from 'src/entities/Circles/CirclePost';

/******************************************************************************
*                                 Router Setup
/******************************************************************************/

const router = Router();
const path = '/circles';
const auth = validation.validateToken;
const redisPort = Number(process.env.REDIS_PORT);
const client = new IORedis(redisPort);
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
		const result = await Circle.Create(req.body.circleObject);
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
		const result = await Circle.Join(req.body.userID, req.body.circleID);
		if (result.exist !== true) {
			res.status(OK).json({memberID: result.memberID});
		} else {
			res.status(BAD_REQUEST).json({exist: true});
		}
	} catch (error) {
		Utility.ErrResponse(res);
	}
});

export const leaveCircle = '/leave';
router.post(leaveCircle, async (req: Request, res: Response) => {
	const result = await Circle.Leave(req.body.memberID);
	if (result === 0) {
		res.status(OK);
	}
});

export const circleFeed = '/circle-feed';
router.get(circleFeed, async (req: Request, res: Response) => {
	try {
		const result = await Circle.GetCircleFeed(req.body.circleID, client);
		res.status(OK).json({circleFeed: result.circleFeed});
	} catch (error) {
		Utility.ErrResponse(res);
	}
});

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



export default { router, path };
