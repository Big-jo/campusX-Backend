import { logger } from '@shared';
import * as admin from 'firebase-admin';
import IORedis from 'ioredis';
import moment from 'moment';

// tslint:disable-next-line:no-var-requires
const serviceAccount = require('../../env/service-file.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export class Notification {
    private fcm = admin.messaging();

    constructor(private deviceToken: string, private notificationPayload: admin.messaging.NotificationMessagePayload,
                private userID: string,
                private avatar: string,
                private category: string,
                private primaryCache: IORedis.Redis) { // Allowed categories: like, comment, mention

        try {// Allowed categories: like, comment, mention
            const notif = {
                notificationPayload,
                avatar: this.avatar,
                createdAt: moment().utc().valueOf(),
                category: this.category,
            };
            const payload = JSON.stringify(notif);
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
                    sound: 'default',
                },
            };
            this.fcm.sendToDevice(this.deviceToken, payload);
        } catch (error) {
            logger.error(error);
        }
    }

    public static async GetNotifications(userID: string, primaryCache: IORedis.Redis) {
        if ((await primaryCache.exists(`notifications:${userID}`) === 1)) {
            const notif = await primaryCache.zrevrange(`notifications:${userID}`, 0, -1);
            primaryCache.del(`notifications:${userID}`);
            return { notifications: notif };
        } else {
            return { new_notifications: false };
        }

    }
}
