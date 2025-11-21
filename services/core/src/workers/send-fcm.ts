
import { Job } from 'bullmq';
import { logger } from '../shared/Logger';

export default async (job: Job) => {
  // TODO: Implement FCM sending logic here
  logger.info('Processing FCM job', { data: job.data });
  return Promise.resolve();
};
