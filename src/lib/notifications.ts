import { logger } from '@shared';
import * as admin from 'firebase-admin';
import IORedis from 'ioredis';
import moment from 'moment';

const serviceAccount = require("../../env/service-file.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

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

export class Notification {
    private fcm = admin.messaging();

    constructor(private deviceToken: string, private notificationPayload: admin.messaging.NotificationMessagePayload,
        private userID: string,
        private avatar: string,
        private category: string) { // Allowed categories: like, comment, mention

        try {// Allowed categories: like, comment, mention
            const notif = {
                notificationPayload,
                avatar: this.avatar,
                createdAt: moment().utc().valueOf(),
                category: this.category,
            }
            const payload = JSON.stringify(notif)
            primaryCache.zadd(`notifications:${this.userID}`, notif.createdAt.toString(), payload);
            const ttl = process.env.NOTIF_EXPIRE as unknown as number;
            primaryCache.expire(`notifications:${this.userID}`, ttl);
        } catch (e) {
            logger.error(e);
        }
    }

    public SendPushNotification() {
        try {
            const payload: admin.messaging.MessagingPayload = {
                notification: {
                    title: this.notificationPayload.title,
                    body: this.notificationPayload.body,
                    sound: "default",
                }
            }
            this.fcm.sendToDevice(this.deviceToken, payload);
        } catch (error) {
            logger.error(error);
        }
    }

    public static async GetNotifications(userID: string) {
        if ((await primaryCache.exists(`notifications:${userID}`) === 1)) {
            const notif = await primaryCache.zrevrange(`notifications:${userID}`, 0, -1)
            return { notifications: notif }
        } else {
            return { new_notifications: false }
        }

    }
}
