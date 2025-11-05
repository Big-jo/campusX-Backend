
import { Job } from 'bullmq';
import { logger } from '../shared/Logger';
import FCM from 'fcm-node';
import User from '../models/User.model';

export const name = 'send-fcm';

export const handler = async (job: Job) => {
  const { userId, notification } = job.data;
  const serverKey = process.env.FCM_SERVER_KEY as string;
  const fcm = new FCM(serverKey);

  const user = await User.findById(userId).exec();

  if (!user || !user.fcm_token) {
    logger.error('User not found or no FCM token', { userId });
    return;
  }

  const message = {
    to: user.fcm_token,
    notification,
  };

  fcm.send(message, (err, response) => {
    if (err) {
      logger.error('Error sending FCM message', { err });
    } else {
      logger.info('FCM message sent', { response });
    }
  });
};
