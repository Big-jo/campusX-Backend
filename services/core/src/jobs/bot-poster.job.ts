import { Job } from 'bullmq';
import { BotPosterService } from '../services/v2/bot-poster.service';
import { logger } from '@shared';

export const name = 'bot-poster';

/**
 * Bot poster job handler
 * Polls pending scraped content and distributes to user timelines
 */
export async function handler(job: Job) {
  logger.info('Starting bot poster job');

  try {
    const botPosterService = new BotPosterService();

    // Process up to 10 pending content items per run
    await botPosterService.distributePendingContent(10);

    logger.info('Bot poster job completed successfully');

    return { status: 'success' };
  } catch (error) {
    logger.error('Bot poster job failed:', error);
    throw error;
  }
}
