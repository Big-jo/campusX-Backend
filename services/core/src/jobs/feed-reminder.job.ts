import { Job } from 'bullmq';
import { logger } from '../shared/Logger';
import User from '../models/User.model';
import { FollowerRepository } from '../repositories/FollowerRepository';
import { PostRepository } from '../repositories/PostRepository';
import RedisClient from '../lib/redis';
import { getQueue } from '../lib/Queue';
import type { OneSignalJobData } from './send-onesignal.job';

export const name = 'feed-reminder';

const SATURATION_THRESHOLD = 0.7; // 70% of followings have posted

/**
 * Feed Reminder Job
 * Sends push notification when user's feed is saturated to ~70% of their followings
 * Logic: If a user follows 100 people and 70+ have posted since last check, notify them
 * Run via cron every 6 hours
 */
export const handler = async (job: Job) => {
  try {
    logger.info('Starting feed-reminder job');

    const redis = RedisClient.getInstance();
    const followerRepo = new FollowerRepository();
    const postRepo = new PostRepository();

    // Find users with OneSignal configured
    const users = await User.find({
      onesignal_player_id: { $exists: true, $ne: null },
      accountType: 'user'
    })
      .select('_id onesignal_player_id')
      .lean()
      .exec();

    logger.info(`Checking feed saturation for ${users.length} users`);

    const notificationQueue = getQueue('send-onesignal');
    let notificationsSent = 0;

    for (const user of users) {
      try {
        const userId = user._id.toString();

        // Get when user last checked their feed
        const lastCheckKey = `v2:newsfeed:lastCheck:${userId}`;
        const lastCheckStr = await redis.get(lastCheckKey);

        if (!lastCheckStr) {
          // User never checked feed, skip for now
          continue;
        }

        const lastCheck = parseInt(lastCheckStr, 10);
        const timelineKey = `v2:newsfeed:timeline:${userId}`;

        // Get posts in timeline since last check
        const postIds = await redis.zrangebyscore(
          timelineKey,
          lastCheck + 1,
          '+inf'
        );

        if (postIds.length === 0) {
          // No new posts since last check
          continue;
        }

        // Get unique authors from these posts
        //TODO: Optimize with pipeline if needed
        const posts = await postRepo.findByIds(postIds);
        const uniqueAuthors = new Set(
          posts.map(post => post.author.toString())
        );

        // Get user's following count (people they follow)
        const followingCount = await followerRepo.getFollowingCount(userId);

        if (followingCount === 0) {
          // User follows nobody, skip
          continue;
        }

        // Calculate saturation ratio
        const saturationRatio = uniqueAuthors.size / followingCount;

        // Send reminder if saturated >= 70%
        if (saturationRatio >= SATURATION_THRESHOLD) {
          await notificationQueue.add('feed-reminder-notification', {
            recipientId: userId,
            actorId: userId, // Self-reminder
            category: 'feed_reminder',
            title: 'Your feed is buzzing!',
            body: `${uniqueAuthors.size} of your followings posted new content`,
            data: {
              newPostCount: postIds.length,
              activeAuthors: uniqueAuthors.size,
              saturation: Math.round(saturationRatio * 100)
            }
          } as OneSignalJobData);

          notificationsSent++;
        }
      } catch (error) {
        logger.error('Error checking feed saturation for user', {
          userId: user._id,
          error
        });
      }
    }

    logger.info(`Feed-reminder job completed. Sent ${notificationsSent} notifications`);
  } catch (error) {
    logger.error('Error in feed-reminder job', { error });
    throw error;
  }
};
