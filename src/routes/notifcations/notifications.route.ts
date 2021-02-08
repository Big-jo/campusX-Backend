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

export const getNotif = '/retrieve';
router.get(getNotif, auth, async (req: Request, res: Response) => {
    try {
        const result = await Notification.GetNotifications(req.token.userID, res.locals.primaryCache);
        if (result.new_notifications === false) {
            res.status(OK).json({ result: [] });
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
