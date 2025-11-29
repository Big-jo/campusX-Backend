import mongoose from 'mongoose';
import { IUser } from '../../interfaces';
import RedisClient from '../../lib/redis';
import { ISuggestionItem } from '../../models/FollowerSuggestion.model';
import { FollowerRepository } from '../../repositories/FollowerRepository';
import { FollowerSuggestionsRepository } from '../../repositories/FollowerSuggestionsRepository';
import { UserRepository } from '../../repositories/UserRepository';

export class FollowerSuggestionsService {
  private followerRepo: FollowerRepository;
  private suggestionsRepo: FollowerSuggestionsRepository;
  private userRepo: UserRepository;
  private redis: ReturnType<typeof RedisClient.getInstance>;

  constructor() {
    this.followerRepo = new FollowerRepository();
    this.suggestionsRepo = new FollowerSuggestionsRepository();
    this.userRepo = new UserRepository();
    this.redis = RedisClient.getInstance();
  }

  /**
   * Get suggestions for a user
   */
  async getUserSuggestions(
    user?: IUser,
    limit: number = 20,
    offset: number = 0,
    refresh: boolean = false,
  ) {
    const userId = user?._id.toString();
    // Force refresh if requested
    if (refresh) {
      await this.computeSuggestionsForUser(user);
    }

    // Try Redis cache first (only for offset 0)
    if (offset === 0 && limit <= 20) {
      const cached = await this.getCachedSuggestions(userId, limit);
      if (cached.length > 0) {
        const enriched = await this.enrichSuggestions(cached, userId);
        return {
          success: true,
          data: enriched,
          meta: {
            total: cached.length,
            limit,
            offset,
            computedAt: new Date(),
            source: 'cache',
          },
        };
      }
    }

    // Fallback to MongoDB
    const { suggestions, total, computedAt } = await this.suggestionsRepo.getSuggestions(
      userId,
      limit,
      offset
    );

    // If no suggestions exist, compute them
    if (suggestions.length === 0) {
      await this.computeSuggestionsForUser(user);
      let { suggestions: newSuggestions, total: newTotal, computedAt: newComputedAt } =
        await this.suggestionsRepo.getSuggestions(userId, limit, offset);

      if (newSuggestions.length === 0) {
        // Get users in same campus as fallback
        const campus = user.userProfile?.university || null;
        const users = await this.userRepo.find(
          {
            _id: { $ne: mongoose.Types.ObjectId(userId) },
            accountType: 'user',
            // 'userProfile.university': campus,
          },
          {
            _id: 1,
            name: 1,
            userTag: 1,
            'userProfile.avatar': 1,
            'userProfile.university': 1,
            'userProfile.rep_points': 1,
            'userProfile.followers': 1,
            'userProfile.bio': 1,
          },
          { limit: 50, skip: offset },
        );

        // Add isFollowing flag to fallback users
        const enrichedFallback = await this.addFollowingStatus(users, userId);

        return {
          success: true,
          data: enrichedFallback,
          meta: {
            total: users.length,
            limit,
            page: offset,
            computedAt: newComputedAt,
            source: 'db',
          },
        };

      }

      const enriched = await this.enrichSuggestions(newSuggestions, userId);
      return {
        success: true,
        data: enriched,
        meta: {
          total: newTotal,
          limit,
          page: offset,
          computedAt: newComputedAt,
          source: 'db',
        },
      };
    }

    const enriched = await this.enrichSuggestions(suggestions, userId);
    return {
      success: true,
      data: enriched,
      meta: {
        total,
        limit,
        offset,
        computedAt,
        source: 'db',
      },
    };
  }

  /**
   * Core algorithm: compute suggestions for a user
   */
  async computeSuggestionsForUser(user: IUser): Promise<ISuggestionItem[]> {
    const userId = user._id.toString();
    // 1. Get user's current followings
    const followings = await this.followerRepo.getFollowings(userId);

    //TODO: If no suggestions, first return list of users closest which would be same campus
    if (followings.length === 0) {
      // No followings = no suggestions yet
      await this.suggestionsRepo.saveSuggestions(userId, []);
      return [];
    }

    // 2. Get user's campus
    const userCampus = user.userProfile?.university || null;

    // 3. Friends-of-Friends aggregation
    const fofCandidates = await this.getFriendsOfFriends(userId, followings);

    if (fofCandidates.length === 0) {
      await this.suggestionsRepo.saveSuggestions(userId, []);
      return [];
    }

    // 4. Enrich candidates with user data
    const candidateIds = fofCandidates.map(c => c._id);
    const candidates = await this.userRepo.find(
      {
        _id: { $in: candidateIds },
        accountType: 'user', // Exclude bots
      },
      {
        _id: 1,
        'userProfile.university': 1,
        'userProfile.rep_points': 1,
        'userProfile.lastSeen': 1,
      }
    );

    // 5. Calculate max values for normalization
    const maxMutual = Math.max(...fofCandidates.map(c => c.mutualCount), 1);
    const maxRepPoints = Math.max(...candidates.map(c => c.userProfile?.rep_points || 0), 1);

    // 6. Score each candidate
    const scored: ISuggestionItem[] = candidates.map(candidate => {
      const fof = fofCandidates.find(f => f._id.toString() === candidate._id.toString());
      const mutualCount = fof?.mutualCount || 0;

      // FOF score (40% weight)
      const fofScore = mutualCount / maxMutual;

      // Campus score (30% weight)
      const candidateCampus = candidate.userProfile?.university || null;
      const isSameCampus = candidateCampus === userCampus && userCampus !== null;
      const campusScore = isSameCampus ? 1.0 : 0.5;

      // Activity × Reputation score (30% weight)
      const lastSeen = candidate.userProfile?.lastSeen || new Date(0);
      const daysSinceActive = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = 1 / (1 + daysSinceActive / 30); // Decay over 30 days
      const repPoints = candidate.userProfile?.rep_points || 0;
      const activityScore = (recencyScore * repPoints) / maxRepPoints;

      // Combined score
      const score = 0.4 * fofScore + 0.3 * campusScore + 0.3 * activityScore;

      return {
        userId: candidate._id,
        score,
        mutualCount,
        campus: candidateCampus || '',
        activityScore,
        reasons: [
          'mutual_followers',
          isSameCampus ? 'same_campus' : 'connected_campus',
        ],
      };
    });

    // 7. Sort by score and take top 50
    const topSuggestions = scored.sort((a, b) => b.score - a.score).slice(0, 50);

    // 8. Save to MongoDB
    await this.suggestionsRepo.saveSuggestions(userId, topSuggestions, 15);

    // 9. Cache top 20 in Redis
    await this.cacheSuggestions(userId, topSuggestions.slice(0, 20));

    return topSuggestions;
  }

  /**
   * Get friends-of-friends using aggregation
   */
  private async getFriendsOfFriends(
    userId: string,
    followings: string[]
  ): Promise<Array<{ _id: string; mutualCount: number }>> {
    const followingIds = followings.map(id => mongoose.Types.ObjectId(id));
    const userObjectId = mongoose.Types.ObjectId(userId);

    const pipeline = [
      // Find users followed by people I follow
      { $match: { follower: { $in: followingIds } } },
      // Exclude myself and people I already follow
      {
        $match: {
          target: {
            $ne: userObjectId,
            $nin: followingIds,
          },
        },
      },
      // Group by target and count mutual connections
      {
        $group: {
          _id: '$target',
          mutualCount: { $sum: 1 },
        },
      },
      // Sort by mutual count
      { $sort: { mutualCount: -1 } },
      // Limit to top 500 candidates
      { $limit: 500 },
    ];

    const results = await this.followerRepo.aggregate(pipeline);
    return results.map(r => ({
      _id: r._id.toString(),
      mutualCount: r.mutualCount,
    }));
  }

  /**
   * Cache suggestions in Redis
   */
  private async cacheSuggestions(userId: string, suggestions: ISuggestionItem[]): Promise<void> {
    const key = `suggestions:${userId}`;

    try {
      // Delete old cache
      await this.redis.del(key);

      if (suggestions.length === 0) {
        return;
      }

      // Store as sorted set with scores
      const pairs: (number | string)[] = [];
      suggestions.forEach(s => {
        pairs.push(s.score, s.userId.toString());
      });

      await this.redis.zadd(key, ...pairs);
      await this.redis.expire(key, 900); // 15 mins TTL
    } catch (error) {
      console.error('Redis cache error:', error);
      // Non-fatal, continue without cache
    }
  }

  /**
   * Get cached suggestions from Redis
   */
  private async getCachedSuggestions(userId: string, limit: number): Promise<ISuggestionItem[]> {
    const key = `suggestions:${userId}`;

    try {
      // Get top N from sorted set (highest scores first)
      const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

      if (results.length === 0) {
        return [];
      }

      // Parse results (alternating userId, score)
      const suggestions: ISuggestionItem[] = [];
      for (let i = 0; i < results.length; i += 2) {
        const userIdStr = results[i];
        const score = parseFloat(results[i + 1]);

        suggestions.push({
          userId: mongoose.Types.ObjectId(userIdStr) as any,
          score,
          mutualCount: 0, // Will be enriched later
          campus: '',
          activityScore: 0,
          reasons: [],
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Redis read error:', error);
      return [];
    }
  }

  /**
   * Enrich suggestions with full user data and following status
   */
  private async enrichSuggestions(suggestions: ISuggestionItem[], currentUserId: string): Promise<any[]> {
    if (suggestions.length === 0) {
      return [];
    }

    const userIds = suggestions.map(s => s.userId);
    const users = await this.userRepo.find(
      { _id: { $in: userIds } },
      {
        _id: 1,
        name: 1,
        userTag: 1,
        'userProfile.avatar': 1,
        'userProfile.university': 1,
        'userProfile.rep_points': 1,
        'userProfile.followers': 1,
        'userProfile.bio': 1,
      }
    );

    // Get following status for all suggested users in batch
    const followingStatuses = await this.getFollowingStatusBatch(
      currentUserId,
      userIds.map(id => id.toString())
    );

    // Create a map for fast lookup
    //TODO: OPTIMISE THIS POS
    const userMap = new Map();
    users.forEach(u => userMap.set(u._id.toString(), u));

    return suggestions
      .map(s => {
        const user = userMap.get(s.userId.toString());
        if (!user) return null;

        const isFollowing = followingStatuses.get(s.userId.toString()) || false;

        return {
          user: {
            _id: user._id,
            name: user.name,
            userTag: user.userTag,
            userProfile: user.userProfile,
          },
          isFollowing,
          score: s.score,
          mutualFollowers: s.mutualCount,
          reasons: s.reasons,
          activityScore: s.activityScore,
        };
      })
      .filter(s => s !== null);
  }

  /**
   * Get following status for multiple users in a single query
   */
  private async getFollowingStatusBatch(
    currentUserId: string,
    targetUserIds: string[]
  ): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>();

    if (!currentUserId || targetUserIds.length === 0) {
      return statusMap;
    }

    // Convert string IDs to ObjectIds
    const targetObjectIds = targetUserIds.map(id => mongoose.Types.ObjectId(id));

    // Query all relationships in one go
    const following = await this.followerRepo.find(
      {
        follower: mongoose.Types.ObjectId(currentUserId),
        target: { $in: targetObjectIds } as any
      },
      { target: 1, _id: 0 }
    );

    // Mark users that are being followed
    following.forEach(f => {
      statusMap.set(f.target.toString(), true);
    });

    // Ensure all target users have an entry (false if not following)
    targetUserIds.forEach(id => {
      if (!statusMap.has(id)) {
        statusMap.set(id, false);
      }
    });

    return statusMap;
  }

  /**
   * Add following status to user objects (for fallback users)
   */
  private async addFollowingStatus(users: any[], currentUserId: string): Promise<any[]> {
    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u._id.toString());
    const followingStatuses = await this.getFollowingStatusBatch(currentUserId, userIds);

    return users.map(user => ({
      ...user.toObject ? user.toObject() : user,
      isFollowing: followingStatuses.get(user._id.toString()) || false,
    }));
  }

  /**
   * Batch compute suggestions for multiple users
   */
  async batchComputeSuggestions(users: IUser[]): Promise<void> {
    const batchSize = 10;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async user => {
          try {
            await this.computeSuggestionsForUser(user);
          } catch (error) {
            console.error(`Failed to compute suggestions for user ${user._id.toString()}:`, error);
          }
        })
      );
    }
  }
}
