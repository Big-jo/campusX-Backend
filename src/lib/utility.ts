import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status-codes';
import {logger} from '@shared';
import sentry from './sentry';
export class Utility {

    public static createToken(payload: any) {
        const secret = process.env.JWT_SECRET as string;
        return jwt.sign(payload, secret);
    }

    public static ErrResponse(res: Response, err: any) {
        try {
            const errMsg = {error: err.message};
            logger.error(err.message);
            sentry.captureException(err);
            res.status(INTERNAL_SERVER_ERROR).json(errMsg);
        } catch (e) {
            logger.error(e);
        }
    }
}
