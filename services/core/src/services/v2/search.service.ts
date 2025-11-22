/**
 * Semantic Search Service
 *
 * Provides ML-powered semantic search with:
 * - Vector similarity via NATS/ML service
 * - Redis caching (5min TTL)
 * - Fallback to MongoDB text search
 * - Post enrichment with author data
 */

import { IUser } from '@interfaces';
import { natsClient } from '../../lib/nats';
import { PostRepository } from '../../repositories/PostRepository';
import { getRedisClient } from '../../lib/redis';
import crypto from 'crypto';

interface SearchOptions {
  query: string;
  campus: string;
  limit?: number;
  filters?: {
    interests?: string[];
    time_window?: number; // hours
  };
}

interface SearchResult {
  posts: any[];
  total: number;
  source: 'ml' | 'cache' | 'fallback';
  latency_ms: number;
}

export class SearchService {
  private postRepo: PostRepository;
  private redis: ReturnType<typeof getRedisClient>;

  constructor() {
    this.postRepo = new PostRepository();
    this.redis = getRedisClient();
  }

  /**
   * Perform semantic search for posts
   */
  async search(options: SearchOptions, user?: IUser): Promise<SearchResult> {
    const startTime = Date.now();
    const limit = options.limit || 20;

    // Generate cache key
    const cacheKey = this.getCacheKey(options);

    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        return {
          ...cachedData,
          source: 'cache',
          latency_ms: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('Redis cache read failed:', error);
      // Continue without cache
    }

    // Try ML semantic search
    try {
      if (natsClient.isConnected()) {
        const postIds = await natsClient.semanticSearch(
          options.query,
          options.campus,
          {
            filters: options.filters,
            limit
          }
        );

        if (postIds && postIds.length > 0) {
          // Enrich posts from MongoDB
          const posts = await this.enrichPosts(postIds);

          //TODO: Type this
          const result = {
            posts,
            total: posts.length,
            source: 'ml' as const,
            latency_ms: Date.now() - startTime
          };

          // Cache result
          this.cacheResult(cacheKey, result).catch(err =>
            console.error('Failed to cache search result:', err)
          );

          return result;
        }
      }
    } catch (error) {
      console.error('ML search failed, falling back to text search:', error);
    }

    // Fallback to MongoDB text search
    return this.textSearchFallback(options, startTime);
  }

  /**
   * Fallback to MongoDB full-text search
   */
  private async textSearchFallback(
    options: SearchOptions,
    startTime: number
  ): Promise<SearchResult> {
    try {
      const posts = await this.postRepo.searchByText(
        options.query,
        options.campus,
        options.limit || 20
      );

      return {
        posts,
        total: posts.length,
        source: 'fallback',
        latency_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('Text search fallback failed:', error);
      return {
        posts: [],
        total: 0,
        source: 'fallback',
        latency_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Enrich post IDs with full post data from MongoDB
   */
  private async enrichPosts(postIds: string[]): Promise<any[]> {
    try {
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

  /**
   * Generate cache key from search options
   */
  private getCacheKey(options: SearchOptions): string {
    const filterStr = JSON.stringify(options.filters || {});
    const hash = crypto
      .createHash('md5')
      .update(`${options.query}:${filterStr}`)
      .digest('hex')
      .substring(0, 8);

    return `ml:search:${options.campus}:${hash}`;
  }

  /**
   * Cache search result (5 min TTL)
   */
  private async cacheResult(key: string, result: any): Promise<void> {
    try {
      const ttl = 300; // 5 minutes
      await this.redis.setex(
        key,
        ttl,
        JSON.stringify({
          posts: result.posts,
          total: result.total,
          source: result.source
        })
      );
    } catch (error) {
      // Non-critical, just log
      console.error('Failed to cache result:', error);
    }
  }

  /**
   * Invalidate search cache for a campus (call when new post created)
   */
  async invalidateCache(campus: string): Promise<void> {
    try {
      const pattern = `ml:search:${campus}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Invalidated ${keys.length} search cache entries for ${campus}`);
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }
}
