import { FollowerRepository } from '../../repositories/FollowerRepository';
import { PostRepository } from '../../repositories/PostRepository';
import RedisClient from '../../lib/redis';
import { NotFoundError } from '../../errors';
import type { Redis } from 'ioredis';
import { createPostDTO } from '../../dtos/post.dto';

interface FeedResponse {
  data: {
    posts: any[];
    hasMore: boolean;
    nextCursor: string | null;
    lastTimestamp: number;
  };
  meta: {
    pollingInterval: number;
    updates?: number;
  };
}

export class NewsfeedService {
  private followerRepo: FollowerRepository;
  private postRepo: PostRepository;
  private redis: Redis;

  constructor() {
    this.followerRepo = new FollowerRepository();
    this.postRepo = new PostRepository();
    this.redis = RedisClient.getInstance();
  }

  /**
   * Get user's newsfeed with pagination
   */
  async getFeed(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<FeedResponse> {
    const timelineKey = `v2:newsfeed:timeline:${userId}`;

    // Get post IDs from Redis sorted set (reverse chronological)
    // Use exclusive range to avoid duplicates when cursor is provided
    const maxScore = cursor ? `(${cursor}` : '+inf'; // (cursor means exclusive
    const postIds = await this.redis.zrevrangebyscore(
      timelineKey,
      maxScore,
      '-inf',
      'LIMIT',
      0,
      limit + 1 // Fetch one extra to check if there are more
    );

    const hasMore = postIds.length > limit;
    const postIdsToFetch = hasMore ? postIds.slice(0, limit) : postIds;

    // Hydrate posts from MongoDB
    let posts: any[] = [];
    let nextCursor: string | null = null;
    let lastTimestamp = 0;

    if (postIdsToFetch.length > 0) {
      posts = await this.postRepo.findWithAuthor(postIdsToFetch, userId);

      // Get the timestamp of the last post for cursor
      if (posts.length > 0) {
        lastTimestamp = posts[0].createdAt || Date.now();
        const lastPost = posts[posts.length - 1];
        nextCursor = hasMore ? (lastPost.createdAt || Date.now()).toString() : null;
      }
    }

    // Update last check timestamp
    await this.redis.setex(`v2:newsfeed:lastCheck:${userId}`, 86400, Date.now().toString());

    // Reset updates counter
    await this.redis.del(`v2:newsfeed:updates:${userId}`);

    return {
      data: {
        posts: posts.map(post => createPostDTO(post)),
        hasMore,
        nextCursor,
        lastTimestamp
      },
      meta: {
        pollingInterval: 30 // Default polling interval in seconds
      }
    };
  }

  /**
   * Long polling for new posts
   */
  async pollFeed(
    userId: string,
    since: number,
    timeout: number = 30,
    limit: number = 20
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    const maxWait = timeout * 1000;

    while (Date.now() - startTime < maxWait) {
      // Check for new posts since timestamp
      const count = await this.checkForUpdates(userId, since);

      if (count > 0) {
        // New posts available - return immediately
        const feed = await this.getFeed(userId, limit);
        return {
          ...feed,
          meta: {
            pollingInterval: 5, // Poll immediately for more
            updates: count
          }
        };
      }

      // Wait before checking again
      await this.sleep(1500); // 1.5 seconds
    }

    // Timeout - return current feed
    const feed = await this.getFeed(userId, limit);
    return {
      ...feed,
      meta: {
        pollingInterval: 30, // Wait longer before next poll
        updates: 0
      }
    };
  }

  /**
   * Check for new posts since a given timestamp
   */
  async checkForUpdates(userId: string, since: number): Promise<number> {
    const timelineKey = `v2:newsfeed:timeline:${userId}`;

    // Count posts with timestamp > since
    const count = await this.redis.zcount(
      timelineKey,
      since + 1,
      '+inf'
    );

    return count;
  }

  /**
   * Fan out post to all followers' timelines
   */
  async fanOutPost(postId: string, authorId: string): Promise<void> {
    // 1. Get all followers
    const followers = await this.followerRepo.getFollowers(authorId);

    // 2. Add self (author always sees own posts)
    const recipients = [...followers, authorId];

    // 3. Get post to extract timestamp
    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const timestamp = post.createdAt || Date.now();

    // 4. Fan out via Redis pipeline (atomic)
    const pipeline = this.redis.pipeline();

    for (const recipientId of recipients) {
      // Add to timeline
      pipeline.zadd(
        `v2:newsfeed:timeline:${recipientId}`,
        timestamp.toString(),
        postId
      );

      // Increment updates counter
      pipeline.incr(`v2:newsfeed:updates:${recipientId}`);
    }

    await pipeline.exec();

    // 5. Trim timelines (keep latest 500)
    const trimPromises = recipients.map(recipientId =>
      this.redis.zremrangebyrank(`v2:newsfeed:timeline:${recipientId}`, 0, -501)
    );

    //IMPLEMENT TIMELINE CLEAN UP AFTER TIMELINE EXPIRY
    await Promise.all(trimPromises);
  }

  /**
   * Remove post from all timelines (for deletion)
   */
  async removeFanOut(postId: string, authorId: string): Promise<void> {
    // Get all followers
    const followers = await this.followerRepo.getFollowers(authorId);
    const recipients = [...followers, authorId];

    // Remove from all timelines
    const pipeline = this.redis.pipeline();

    for (const recipientId of recipients) {
      pipeline.zrem(`v2:newsfeed:timeline:${recipientId}`, postId);
    }

    await pipeline.exec();
  }

  /**
   * Add a single post to a user's timeline
   */
  async addToTimeline(userId: string, postId: string, timestamp: number): Promise<void> {
    await this.redis.zadd(
      `v2:newsfeed:timeline:${userId}`,
      timestamp.toString(),
      postId
    );

    // Trim to max 500 posts
    await this.redis.zremrangebyrank(`v2:newsfeed:timeline:${userId}`, 0, -501);
  }

  /**
   * Remove a single post from a user's timeline
   */
  async removeFromTimeline(userId: string, postId: string): Promise<void> {
    await this.redis.zrem(`v2:newsfeed:timeline:${userId}`, postId);
  }

  /**
   * Helper: sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
