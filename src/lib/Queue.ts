import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

const queues: { [key: string]: Queue } = {};

export const registerQueue = (name: string) => {
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection });
  }
};

export const getQueue = (name: string): Queue => {
  if (!queues[name]) {
    throw new Error(`Queue ${name} not registered`);
  }
  return queues[name];
};

export const startWorker = (queueName: string, workerPath: string) => {
  new Worker(queueName, workerPath, { connection });
};