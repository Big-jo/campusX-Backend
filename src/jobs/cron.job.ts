
import { getQueue } from '../lib/Queue';
import Campus from '../models/Campus.model';
import User from '../models/User.model';
import { Newsfeed } from '../lib/newsfeeds';
import IORedis from 'ioredis';


export const name = 'cron';

export const handler = async (job: { name: string; }) => {
  switch (job.name) {
    case 'clean-campus-timeline':
      const campuses = await Campus.find({}).exec();
      for (const campus of campuses) {
        const campusTimeline = new Newsfeed(campus._id);
        await campusTimeline.cleanTimeline();
      }
      break;
    case 'clean-visited-circles-cache':
      const redis = new IORedis(process.env.REDIS_URL as string);
      const stream = redis.scanStream({
        match: 'visited-circles:*',
      });
      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          const pipeline = redis.pipeline();
          keys.forEach(key => {
            pipeline.del(key);
          });
          pipeline.exec();
        }
      });
      break;
    case 'clean-up-timelines':
      const users = await User.find({}).exec();
      for (const user of users) {
        const newsfeed = new Newsfeed(user._id);
        await newsfeed.cleanTimeline();
      }
      break;
  }
};

export const cron = () => {
  const queue = getQueue(name);
  queue.add('clean-campus-timeline', null, { repeat: { cron: '0 0 * * *' } });
  queue.add('clean-visited-circles-cache', null, { repeat: { cron: '0 0 * * *' } });
  queue.add('clean-up-timelines', null, { repeat: { cron: '0 0 * * *' } });
};
