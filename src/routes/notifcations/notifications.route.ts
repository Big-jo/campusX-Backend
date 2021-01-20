import { Router, Response, Request } from 'express';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';
import { Notification } from '@lib'
const router = Router();

const path = '/notify';

const auth = validation.validateToken;

let primaryCache: IORedis.Redis;
let postCache: IORedis.Redis;

/******************************************************************************
 *                                 SETUP REDIS
 /******************************************************************************/

if (process.env.NODE_ENV === 'development') {
    primaryCache = new IORedis();
    postCache = new IORedis({ port: 6379 });
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
 *              Get Notifcations
 *********************************************************/
export const getNotif = '/retrieve';
router.get(getNotif, auth, async (req: Request, res: Response) => {
    try {
        const result = await Notification.GetNotifications(req.token.userID);
        if (result.new_notifications === false) {
            res.status(OK).json(result.new_notifications);
        } else {
            const r = [];
            for (let index = 0; index < result.notifications.length; index++) {
                const element = result.notifications[index];
                r.push(JSON.parse(element));
            }
            res.status(OK).json({ result: r });
        }

    } catch (error) {
        Utility.ErrResponse(res, error);
    }
})

export default { router, path };
