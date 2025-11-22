import { Job } from 'bullmq';
import { logger } from '../shared/Logger';
import { OneSignalNotification } from '../lib/onesignal';
import User from '../models/User.model';

export const name = 'send-onesignal';

export interface OneSignalJobData {
  recipientId: string; // User ID of notification recipient
  actorId: string; // User ID of person performing action
  category: 'like' | 'comment' | 'mention' | 'follower' | 'feed_reminder';
  title: string;
  body: string;
  data?: any;
}

export const handler = async (job: Job<OneSignalJobData>) => {
  const { recipientId, actorId, category, title, body, data } = job.data;

  try {
    const [recipient, actor] = await Promise.all([
      User.findById(recipientId).lean().exec(),
      User.findById(actorId).lean().exec()
    ]);

    if (!recipient) {
      logger.error('Recipient not found', { recipientId });
      return;
    }

    if (!recipient.onesignal_player_id) {
      logger.warn('Recipient has no OneSignal player ID', { recipientId });
      return;
    }

    if (!actor) {
      logger.error('Actor not found', { actorId });
      return;
    }

    // Don't send notification to self
    if (recipientId === actorId) {
      return;
    }

    const notification = new OneSignalNotification(
      recipient.onesignal_player_id,
      { title, body, data },
      recipientId,
      actor.userProfile?.avatar || '',
      category,
      actorId
    );

    await notification.sendPushNotification();
    logger.info('OneSignal notification sent', { recipientId, category });
  } catch (error) {
    logger.error('Error sending OneSignal notification', { error, jobData: job.data });
    throw error; // Re-throw to trigger retry
  }
};
