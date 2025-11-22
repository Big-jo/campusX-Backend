import { logger } from '@shared';
import * as OneSignal from 'onesignal-node';
import moment from 'moment';
import NotificationModel from '../models/Notification.model';
import mongoose from 'mongoose';

const isTestEnvironment = process.env.NODE_ENV === 'test';

let oneSignalClient: OneSignal.Client | null = null;

if (!isTestEnvironment) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    logger.error('Missing OneSignal credentials in environment variables');
    logger.error('Required: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY');
    throw new Error('OneSignal credentials not configured');
  }

  oneSignalClient = new OneSignal.Client(appId, restApiKey);
  logger.info('OneSignal initialized successfully');
} else {
  logger.info('OneSignal initialization skipped (test environment)');
}

export interface OneSignalNotificationPayload {
  title: string;
  body: string;
  data?: any;
}

export class OneSignalNotification {
  private client = oneSignalClient;

  constructor(
    private playerIds: string | string[],
    private notificationPayload: OneSignalNotificationPayload,
    private userID: string,
    private avatar: string,
    private category: string, // 'like', 'comment', 'mention', 'follower', 'feed_reminder'
    private actor: string
  ) {
    try {
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
    } catch (e) {
      logger.error(e);
    }
  }

  public async sendPushNotification() {
    try {
      if (isTestEnvironment || !this.client) {
        logger.info('[TEST] Push notification skipped');
        return;
      }

      // Don't send notification to self
      if (this.actor.toString() === this.userID.toString()) {
        return;
      }

      const playerIdArray = Array.isArray(this.playerIds) ? this.playerIds : [this.playerIds];

      // Filter out empty or invalid player IDs
      const validPlayerIds = playerIdArray.filter(id => id && id.trim().length > 0);

      if (validPlayerIds.length === 0) {
        logger.warn('No valid OneSignal player IDs provided');
        return;
      }

      const notification = {
        contents: { en: this.notificationPayload.body },
        headings: { en: this.notificationPayload.title },
        include_player_ids: validPlayerIds,
        data: this.notificationPayload.data || {},
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      };

      const response = await this.client.createNotification(notification);
      logger.info('OneSignal notification sent', { response });
    } catch (error) {
      logger.error('OneSignal send error:', error);
    }
  }

  public static async getNotifications(userID: string, category?: string) {
    const query: any = {
      userID: mongoose.Types.ObjectId(userID),
    };

    if (!!category) {
      query['category'] = category;
    }

    const notifications = await NotificationModel.find(query)
      .populate({
        path: 'data',
        populate: {
          path: 'author',
          select: { password: 0 },
        },
      })
      .populate({ path: 'actor', select: { password: 0 } })
      .exec();

    return { payload: notifications.reverse() };
  }
}
