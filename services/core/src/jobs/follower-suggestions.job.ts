import { Job } from 'bullmq';
import { FollowerSuggestionsService } from '../services/v2/follower-suggestions.service';
import { logger } from '@shared';
import User from '../models/User.model';

export const name = 'follower-suggestions';

/**
 * Follower suggestions job handler
 * Computes suggestions for users, prioritizing inactive users for re-engagement
 */
export async function handler(job: Job) {
  logger.info('Starting follower suggestions job');

  try {
    const service = new FollowerSuggestionsService();

    // Find users to update
    // Prioritize: inactive users (old lastSeen) with at least 1 following
    const users = await User.find({
      accountType: 'user',
      'userProfile.followings': { $gte: 1 },
    })
      .sort({ 'userProfile.lastSeen': 1 }) // Oldest first (re-engagement)
      .limit(1000)
      .select('_id')
      .exec();

    logger.info(`Found ${users.length} users to process`);

    if (users.length === 0) {
      logger.info('No users to process');
      return { status: 'success', processed: 0 };
    }

    // Process in batches
    const userIds = users.map(u => u._id.toString());
    await service.batchComputeSuggestions(users);

    logger.info(`Follower suggestions job completed. Processed ${users.length} users`);

    return { status: 'success', processed: users.length };
  } catch (error) {
    logger.error('Follower suggestions job failed:', error);
    throw error;
  }
}
