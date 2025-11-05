
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as sendFcmJob from './jobs/send-fcm.job';
import * as cronJob from './jobs/cron.job';
import { registerQueue } from './lib/queue';

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

const jobs = [sendFcmJob, cronJob];

registerQueue(sendFcmJob.name);
registerQueue(cronJob.name);

jobs.forEach(job => {
  new Worker(job.name, job.handler, { connection });
});

cronJob.cron();
