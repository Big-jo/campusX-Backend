import mongoose from 'mongoose';
import ScrapedContent, { IScrapedContent } from '../../models/ScrapedContent.model';
import Bot, { IBot } from '../../models/bots';
import Post from '../../models/Post.model';
import User from '../../models/User.model';
import RedisClient from '../../lib/redis';
import type { Redis } from 'ioredis';
import { logger } from '@shared';

export class BotPosterService {
  private redis: Redis;

  constructor() {
    this.redis = RedisClient.getInstance();
  }

  /**
   * Poll pending scraped content and distribute to user timelines
   * Called by BullMQ cron job
   */
  async distributePendingContent(limit: number = 10): Promise<void> {
    try {
      // 1. Find pending content
      const pendingContent = await ScrapedContent.find({ status: 'pending' })
        .sort({ scrapedAt: -1 })
        .limit(limit);

      if (pendingContent.length === 0) {
        logger.info('No pending content to distribute');
        return;
      }

      logger.info(`Found ${pendingContent.length} pending content items`);

      // 2. Process each content
      for (const content of pendingContent) {
        try {
          await this.distributeContent(content);
        } catch (error) {
          logger.error(`Failed to distribute content ${content._id}:`, error);
          // Continue with next content
        }
      }

      logger.info('Content distribution complete');
    } catch (error) {
      logger.error('Failed to distribute pending content:', error);
      throw error;
    }
  }

  /**
   * Distribute a single content item to user timelines
   */
  private async distributeContent(content: IScrapedContent): Promise<void> {
    // 1. Find bot for this interest category
    const bot = await Bot.findOne({ botType: content.interestCategory, status: 'active' }) as IBot | null;

    if (!bot) {
      logger.warn(`No active bot found for category: ${content.interestCategory}`);
      // Mark as rejected
      await ScrapedContent.findByIdAndUpdate(content._id, { status: 'rejected' });
      return;
    }

    // 2. Check daily posting limit
    //TODO: This should depend on the bot config
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const postsToday = await Post.countDocuments({
      author: bot.user_id,
      createdAt: { $gte: todayStart.getTime() }
    });

    if (postsToday >= bot.config.maxPostsPerDay) {
      logger.info(
        `Bot ${bot.user_id} reached daily limit (${postsToday}/${bot.config.maxPostsPerDay})`
      );
      return; // Skip this content for now
    }

    // 3. Create post
    const post = await this.createBotPost(content, bot.user_id);

    // 4. Find target users (users with matching interest)
    // Supports partial match + wildcard (*)
    const targetUsers = await User.find({
      $or: [
        { "userProfile.interests": { $regex: content.interestCategory, $options: 'i' } },
        { "userProfile.interests": '*' } // Wildcard: users who want all content
      ],
      accountType: 'user'
    }).select('_id');

    if (targetUsers.length === 0) {
      logger.warn(`No users found with interest: ${content.interestCategory}`);
      await ScrapedContent.findByIdAndUpdate(content._id, { status: 'posted' });
      return;
    }

    logger.info(
      `Distributing post ${post._id} to ${targetUsers.length} users with interest: ${content.interestCategory}`
    );

    // 5. Inject into user timelines (Redis)
    await this.injectToTimelines(post._id.toString(), post.createdAt, targetUsers);

    // 6. Update content status
    await ScrapedContent.findByIdAndUpdate(content._id, {
      status: 'posted',
      $push: { usedByBots: bot.user_id }
    });

    // 7. Update bot stats
    await Bot.findOneAndUpdate(
      { user_id: bot.user_id },
      {
        $inc: { 'stats.totalPosts': 1 },
        $set: { 'stats.lastPostAt': Date.now() }
      }
    );

    logger.info(`Successfully distributed post ${post._id} to ${targetUsers.length} timelines`);
  }

  /**
   * Create a Post from scraped content
   */
  private async createBotPost(
    content: IScrapedContent,
    botUserId: mongoose.Types.ObjectId
  ): Promise<any> {
    // Format content for post
    const postText = this.formatContentAsPost(content);

    const post = await Post.create({
      author: botUserId,
      text: postText,
      image: content.images.length > 0 ? content.images[0] : null,
      campus: 'global', // Bots post to global campus
      type: 'post',
      createdAt: Date.now(),
      hashTags: content.keywords.slice(0, 5), // Use top 5 keywords as hashtags
      likes: 0,
      dislikes: 0,
      comments: 0
    });

    logger.info(`Created bot post ${post._id} from content ${content._id}`);

    return post;
  }

  /**
   * Format scraped content as a post (truncate, add source attribution)
   */
  private formatContentAsPost(content: IScrapedContent): string {
    // Use title + excerpt from content
    const maxLength = 500;
    const excerpt = content.content.slice(0, maxLength);

    // Add source attribution
    const source = content.sourceDomain;

    return `${content.title}\n\n${excerpt}${excerpt.length >= maxLength ? '...' : ''}\n\n📰 Source: ${source}`;
  }

  /**
   * Inject post into user timelines (direct timeline injection)
   */
  private async injectToTimelines(
    postId: string,
    timestamp: number,
    users: Array<{ _id: mongoose.Types.ObjectId }>
  ): Promise<void> {
    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    //TODO: Optimise
    for (const user of users) {
      const userId = user._id.toString();

      // Add to timeline sorted set (score = timestamp)
      pipeline.zadd(`v2:newsfeed:timeline:${userId}`, timestamp.toString(), postId);

      // Increment updates counter
      pipeline.incr(`v2:newsfeed:updates:${userId}`);
    }

    await pipeline.exec();

    // Trim timelines to max 500 posts (keep memory usage low)
    await Promise.all(
      users.map((user) =>
        this.redis.zremrangebyrank(`v2:newsfeed:timeline:${user._id.toString()}`, 0, -501)
      )
    );
  }
}
