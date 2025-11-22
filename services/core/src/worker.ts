
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import * as sendOneSignalJob from './jobs/send-onesignal.job';
import * as cronJob from './jobs/cron.job';
import * as botPosterJob from './jobs/bot-poster.job';
import * as feedReminderJob from './jobs/feed-reminder.job';
import { registerQueue, getQueue } from './lib/Queue';
import RedisClient from './lib/redis';

const connection = RedisClient.getInstance() as Redis;

const jobs = [sendOneSignalJob, cronJob, botPosterJob, feedReminderJob];

export const startWorker = () => {
  registerQueue(sendOneSignalJob.name);
  registerQueue(cronJob.name);
  registerQueue(botPosterJob.name);
  registerQueue(feedReminderJob.name);

  jobs.forEach(job => {
    new Worker(job.name, job.handler, { connection });
  });

  cronJob.cron();

  // Schedule feed-reminder job every 1 hour
  const feedReminderQueue = getQueue(feedReminderJob.name);
  feedReminderQueue.add('check-feed-saturation', null, {
    repeat: { pattern: '0 * * * *' } // Every hour at :00
  });
};
