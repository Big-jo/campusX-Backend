
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import * as sendFcmJob from './jobs/send-fcm.job';
import * as cronJob from './jobs/cron.job';
import * as botPosterJob from './jobs/bot-poster.job';
import { registerQueue } from './lib/Queue';
import RedisClient from './lib/redis';

const connection = RedisClient.getInstance() as Redis;

const jobs = [sendFcmJob, cronJob, botPosterJob];

export const startWorker = () => {
  registerQueue(sendFcmJob.name);
  registerQueue(cronJob.name);
  registerQueue(botPosterJob.name);

  jobs.forEach(job => {
    new Worker(job.name, job.handler, { connection });
  });

  cronJob.cron();
};
