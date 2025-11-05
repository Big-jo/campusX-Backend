
import { Job } from 'bullmq';
import { Logger } from '../shared/Logger';

export default async (job: Job) => {
  // TODO: Implement FCM sending logic here
  Logger.info('Processing FCM job', { data: job.data });
  return Promise.resolve();
};
