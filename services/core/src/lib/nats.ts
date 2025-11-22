/**
 * NATS client wrapper for ML service communication
 */

import { connect, NatsConnection, JSONCodec, Msg } from 'nats';
import {logger} from '@shared';

const codec = JSONCodec();

interface SearchRequest {
  query: string;
  campus: string;
  filters?: {
    interests?: string[];
    time_window?: number;
  };
  limit: number;
}

interface SearchResponse {
  post_ids: string[];
  scores: number[];
  latency_ms: number;
  source: string;
}

interface TrendingRequest {
  campus: string;
  time_window: '6h' | '24h' | '7d';
  limit: number;
}

interface TrendingTopic {
  topic: string;
  score: number;
  post_ids: string[];
  hashtags: string[];
}

interface TrendingResponse {
  topics: TrendingTopic[];
  computed_at: number;
  cache_ttl: number;
  source: string;
}

interface UserSuggestionsRequest {
  user_id: string;
  campus: string;
  limit: number;
}

interface UserSuggestion {
  user_id: string;
  ml_score: number;
  reason: 'engagement' | 'interests';
}

interface UserSuggestionsResponse {
  users: UserSuggestion[];
  source: string;
}

interface PostCreatedEvent {
  post_id: string;
  text: string;
  campus: string;
  author_id: string;
  created_at: number;
  hashtags?: string[];
}

class NATSClient {
  private nc: NatsConnection | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnects: number = 10;

  async connect(url?: string): Promise<void> {
    if (this.connected) {
      logger.info('NATS already connected');
      return;
    }

    const natsUrl = url || process.env.NATS_URL || 'nats://localhost:4222';

    try {
      this.nc = await connect({
        servers: natsUrl,
        maxReconnectAttempts: this.maxReconnects,
        reconnectTimeWait: 1000, // 1s between retries
      });

      this.connected = true;
      logger.info(`Connected to NATS at ${natsUrl}`);

      // Handle connection lifecycle
      (async () => {
        if (!this.nc) return;

        for await (const status of this.nc.status()) {
          switch (status.type) {
            case 'disconnect':
              logger.warn('NATS disconnected, will auto-reconnect');
              this.connected = false;
              break;
            case 'reconnect':
              logger.info('NATS reconnected successfully');
              this.connected = true;
              this.reconnectAttempts = 0;
              break;
            case 'error':
              logger.error('NATS error:', status.data);
              break;
          }
        }
      })().catch((err) => {
        logger.error('NATS status monitoring error:', err);
      });
    } catch (error) {
      logger.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
      this.connected = false;
      logger.info('Disconnected from NATS');
    }
  }

  /**
   * Publish post created event (fire-and-forget)
   */
  async publishPostCreated(event: PostCreatedEvent): Promise<void> {
    if (!this.nc || !this.connected) {
      throw new Error('NATS not connected');
    }

    this.nc.publish('ml.post.created', codec.encode(event));
    logger.debug(`Published ml.post.created for post ${event.post_id}`);
  }

  /**
   * Semantic search request
   */
  async semanticSearch(
    query: string,
    campus: string,
    options: { filters?: any; limit?: number } = {}
  ): Promise<string[]> {
    if (!this.nc || !this.connected) {
      throw new Error('NATS not connected');
    }

    const request: SearchRequest = {
      query,
      campus,
      filters: options.filters,
      limit: options.limit || 20,
    };

    try {
      const response = await this.nc.request(
        'ml.search.query',
        codec.encode(request),
        { timeout: 500 } // 500ms timeout
      );

      const data = codec.decode(response.data) as SearchResponse;

      if ('error' in data) {
        logger.error('Search request failed:', data);
        throw new Error((data as any).message || 'Search failed');
      }

      return data.post_ids;
    } catch (error: any) {
      if (error.code === 'TIMEOUT') {
        logger.error('Search request timed out');
      }
      throw error;
    }
  }

  /**
   * Get trending posts
   */
  async getTrending(
    campus: string,
    timeWindow: '6h' | '24h' | '7d' = '6h',
    limit: number = 10
  ): Promise<TrendingResponse> {
    if (!this.nc || !this.connected) {
      throw new Error('NATS not connected');
    }

    const request: TrendingRequest = {
      campus,
      time_window: timeWindow,
      limit,
    };

    try {
      const response = await this.nc.request(
        'ml.trending.request',
        codec.encode(request),
        { timeout: 500 }
      );

      const data = codec.decode(response.data) as TrendingResponse;

      if ('error' in data) {
        throw new Error((data as any).message || 'Trending request failed');
      }

      return data;
    } catch (error: any) {
      if (error.code === 'TIMEOUT') {
        logger.error('Trending request timed out');
      }
      throw error;
    }
  }

  /**
   * Get ML-enhanced user suggestions
   */
  async getUserSuggestions(
    userId: string,
    campus: string,
    limit: number = 20
  ): Promise<UserSuggestion[]> {
    if (!this.nc || !this.connected) {
      throw new Error('NATS not connected');
    }

    const request: UserSuggestionsRequest = {
      user_id: userId,
      campus,
      limit,
    };

    try {
      const response = await this.nc.request(
        'ml.suggestions.request',
        codec.encode(request),
        { timeout: 500 }
      );

      const data = codec.decode(response.data) as UserSuggestionsResponse;

      if ('error' in data) {
        throw new Error((data as any).message || 'User suggestions failed');
      }

      return data.users;
    } catch (error: any) {
      if (error.code === 'TIMEOUT') {
        logger.error('User suggestions request timed out');
      }
      // Return empty array for graceful degradation
      logger.warn('User suggestions failed, returning empty:', error.message);
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
export const natsClient = new NATSClient();

export default natsClient;
