import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { Request, Response, Router, response } from 'express';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import validation from '../../middleware/auth';
import { Campus } from '../../entities/Campus';

/******************************************************************************
*                                 Router Setup
/******************************************************************************/

const router = Router();
const path = '/campus';
const auth = validation.validateToken;
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
   logger.error(err);
});

export const getCampuses = '/list';
router.get(getCampuses, async (req: Request, res: Response) => {
    try {
        const result = await Campus.GetList(client);
        res.status(OK).json({campuses: result});
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

export const getPost = '/posts';
router.get(getPost, async (req: Request, res: Response) => {
    try {
        const result = await Campus.GetPosts(client, req.body.campus);
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

export default {router, path};
