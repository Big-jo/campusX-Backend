/**
 * Trending Controller
 * Handles trending posts requests
 */

import { Request, Response } from 'express';
import { TrendingService } from '../../services/v2/trending.service';
import { IUser } from '@interfaces';

interface AuthRequest extends Request {
  user?: IUser;
}

export class TrendingController {
  private trendingService: TrendingService;

  constructor() {
    this.trendingService = new TrendingService();
  }

  /**
   * Get trending posts for a campus
   * GET /api/v2/trending
   */
  getTrending = async (req: AuthRequest, res: Response): Promise<void> => {
    const { campus, timeWindow, limit } = req.query;
    const user = req.user;

    // Parse limit
    const parsedLimit = limit ? parseInt(limit as string) : undefined;

    // Get trending
    const result = await this.trendingService.getTrending(
      {
        campus: campus as string,
        timeWindow: timeWindow as '6h' | '24h' | '7d' | undefined,
        limit: parsedLimit
      },
      user
    );

    res.status(200).json({
      success: true,
      data: result
    });
  };

  /**
   * Get trending topics for a campus (without posts)
   * GET /api/v2/trending/topics
   */
  getTrendingTopics = async (req: AuthRequest, res: Response): Promise<void> => {
    const { campus, timeWindow, limit } = req.query;
    const user = req.user;

    // Parse limit
    const parsedLimit = limit ? parseInt(limit as string) : undefined;

    // Get trending topics
    const result = await this.trendingService.getTrendingTopics(
      {
        campus: campus as string,
        timeWindow: timeWindow as '6h' | '24h' | '7d' | undefined,
        limit: parsedLimit
      },
      user
    );

    res.status(200).json({
      success: true,
      data: result
    });
  };
}
