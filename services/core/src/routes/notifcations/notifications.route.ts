// @ts-nocheck
import { Router, Response, Request } from 'express';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import type { Redis } from 'ioredis';
import {Notification, Utility} from '@lib';
import NotificationModel from '../../models/Notification.model';
const router = Router();

const path = '/notify';

const auth = validation.validateToken;

export const getNotif = '/retrieve';
router.get(getNotif, auth, async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.GetNotifications(req.token.userID, req.query.category);
        res.json({notifications});
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});

export default { router, path };
