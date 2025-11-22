/**
 * Trending Posts Service
 *
 * Provides ML-powered trending posts with:
 * - TF-IDF topic extraction
 * - Engagement scoring
 * - Redis caching (15min TTL)
 * - Post enrichment with author data
 */

import { IUser } from '@interfaces';
import { natsClient } from '../../lib/nats';
import { PostRepository } from '../../repositories/PostRepository';

interface TrendingOptions {
  campus: string;
  timeWindow?: '6h' | '24h' | '7d';
  limit?: number;
}

interface TrendingTopic {
  topic: string;
  score: number;
  posts: any[];
  hashtags: string[];
}

interface TrendingResult {
  topics: TrendingTopic[];
  total: number;
  source: string;
  computed_at: number;
  latency_ms: number;
}

export class TrendingService {
  private postRepo: PostRepository;

  constructor() {
    this.postRepo = new PostRepository();
  }

  /**
   * Get trending posts for a campus
   */
  async getTrending(options: TrendingOptions, user?: IUser): Promise<TrendingResult> {
    const startTime = Date.now();

    // Default campus to user's campus
    const campus = options.campus || user?.userProfile?.university || 'all';
    const timeWindow = options.timeWindow || '6h';
    const limit = Math.min(options.limit || 10, 20);

    try {
      // Request trending from ML service via NATS
      if (natsClient.isConnected()) {
        const response = await natsClient.getTrending(campus, timeWindow, limit);

        // Enrich each topic's posts with full data
        const enrichedTopics = await Promise.all(
          response.topics.map(async (topic) => {
            const posts = await this.enrichPosts(topic.post_ids);
            return {
              topic: topic.topic,
              score: topic.score,
              posts,
              hashtags: topic.hashtags
            };
          })
        );

        return {
          topics: enrichedTopics,
          total: enrichedTopics.reduce((sum, t) => sum + t.posts.length, 0),
          source: response.source || 'ml',
          computed_at: response.computed_at,
          latency_ms: Date.now() - startTime
        };
      }

      // NATS not available - return empty
      return {
        topics: [],
        total: 0,
        source: 'unavailable',
        computed_at: Math.floor(Date.now() / 1000),
        latency_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('Failed to get trending posts:', error);

      // Return empty on error
      return {
        topics: [],
        total: 0,
        source: 'error',
        computed_at: Math.floor(Date.now() / 1000),
        latency_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Enrich post IDs with full post data from MongoDB
   */
  private async enrichPosts(postIds: string[]): Promise<any[]> {
    try {
      if (!postIds || postIds.length === 0) {
        return [];
      }

      const posts = await this.postRepo.findByIds(postIds);

      // Populate author data
      const enriched = await this.postRepo.populateAuthor(posts);

      // Maintain order from ML service (sorted by relevance)
      const postMap = new Map(enriched.map(p => [p._id.toString(), p]));
      return postIds
        .map(id => postMap.get(id))
        .filter(p => p !== undefined);

    } catch (error) {
      console.error('Failed to enrich posts:', error);
      return [];
    }
  }
}
