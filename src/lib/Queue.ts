import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import path from 'path';
import RedisClient from './redis';

const connection = RedisClient.getInstance();

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