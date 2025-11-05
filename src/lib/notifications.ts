import { logger } from '@shared';
import admin from 'firebase-admin';
import IORedis from 'ioredis';
import moment from 'moment';
import NotificationModel from '../models/Notification.model';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin only if not in test environment
const isTestEnvironment = process.env.NODE_ENV === 'test';
const serviceFilePath = path.join(__dirname, '../../env/service-file.json');

if (!isTestEnvironment && fs.existsSync(serviceFilePath)) {
  // tslint:disable-next-line:no-var-requires
  const serviceAccount = require('../../env/service-file.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (isTestEnvironment) {
  // Mock initialization for tests
  logger.info('Firebase Admin initialization skipped (test environment)');
}

export class Notification {
  private fcm = isTestEnvironment ? null : admin.messaging();

  constructor(private deviceToken: string,
    private notificationPayload: admin.messaging.NotificationMessagePayload,
    private userID: string,
    private avatar: string,
    private category: string,
    private actor: string,
  ) { // Allowed categories: like, comment, mention

    try {// Allowed categories: like, comment, mention
      const notif = {
        title: notificationPayload.title,
        body: notificationPayload.body,
        userID,
        avatar: this.avatar,
        createdAt: moment().utc().valueOf(),
        category: this.category,
        actor,
      } as any;

      if (!!notificationPayload.data) {
        notif.data = notificationPayload.data;
      }

      new NotificationModel(notif).save();
      // const payload = JSON.stringify(notif);
      // primaryCache.zadd(`notifications:${this.userID}`, notif.createdAt.toString(), payload);
      // const ttl = process.env.NOTIF_EXPIRE as unknown as number;
      // primaryCache.expire(`notifications:${this.userID}`, ttl);
    } catch (e) {
      logger.error(e);
    }
  }

  public SendPushNotification() {
    try {
      // Skip sending in test environment
      if (isTestEnvironment || !this.fcm) {
        logger.info('[TEST] Push notification skipped');
        return;
      }

      const payload: admin.messaging.MessagingPayload = {
        notification: {
          title: this.notificationPayload.title,
          body: this.notificationPayload.body,
          sound: 'default',
        },
      };

      //@ts-ignore
      if (this.actor.toString() !== this.userID.toString) this.fcm.sendToDevice(this.deviceToken, payload);

    } catch (error) {
      logger.error(error);
    }
  }

  public static async GetNotifications(userID: string, category?: string) {
    const query: any = {
      userID: mongoose.Types.ObjectId(userID),
    };

    if (!!category) {
      query['category'] = category;
    }
    const notifications = await NotificationModel.find(query).populate({
      path: 'data', populate: {
        path: 'author',
        select: { pasword: 0 }
      }
    }).populate({ path: 'actor', select: { password: 0 } }).exec();
    return { payload: notifications.reverse() };



    // if ((await primaryCache.exists(`notifications:${userID}`) === 1)) {
    //     const notif = await primaryCache.zrevrange(`notifications:${userID}`, 0, -1);
    //     primaryCache.del(`notifications:${userID}`);
    //     return { notifications: notif };
    // } else {
    //     return { new_notifications: false };
    // }

  }
}
