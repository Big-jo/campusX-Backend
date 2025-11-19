
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import * as sendFcmJob from './jobs/send-fcm.job';
import * as cronJob from './jobs/cron.job';
import { registerQueue } from './lib/Queue';

const connection = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

const jobs = [sendFcmJob, cronJob];

registerQueue(sendFcmJob.name);
registerQueue(cronJob.name);

jobs.forEach(job => {
  new Worker(job.name, job.handler, { connection });
});

cronJob.cron();
