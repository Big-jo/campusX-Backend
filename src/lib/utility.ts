import jwt from 'jsonwebtoken';
import {Response} from 'express';
import {INTERNAL_SERVER_ERROR} from 'http-status-codes';
import {logger} from '@shared';
import sentry from './sentry';
import {ITokenPayload} from 'src/interfaces/ITokenPayload';
import Moment from 'moment';
import moment from 'moment';
import IORedis from 'ioredis';

export class Utility {

    public static createToken(payload: ITokenPayload) {
        const secret = process.env.JWT_SECRET as string;
        return jwt.sign(payload, secret);
    }

    public static ErrResponse(res: Response, err: any) {
        try {
            const errMsg = { error: err.message };
            logger.error(err.message);
            sentry.captureException(err);
            res.status(INTERNAL_SERVER_ERROR).json(errMsg);
        } catch (e) {
            logger.error(e);
        }
    }
    
    public static filterRedisPipeline(piplelineResult: Array<[Error | null, any]>) {
        return piplelineResult.map(value => value[1]);
    }

    /**
     *
     * @param key - Key for structure in redis
     * @param member - Name of field to be cleared in structure
     * @param expiryTime - Expiry time
     * @
     * @param timeUnit
     * @param redis
     */
    public static CacheExpiryTracker(key: string, member: string, expiryTime: number, timeUnit: Moment.unitOfTime.DurationConstructor, redis: IORedis.Redis) {
        const ttl = moment().utc().add(expiryTime, timeUnit).valueOf().toString();
        redis.zadd(key, ttl, member );
    }
}
