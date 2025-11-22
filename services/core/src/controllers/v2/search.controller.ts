/**
 * Search Controller
 * Handles semantic search requests
 */

import { Request, Response } from 'express';
import { SearchService } from '../../services/v2/search.service';
import { IUser } from '@interfaces';

interface AuthRequest extends Request {
  user?: IUser;
}

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Search posts using semantic search
   * GET /api/v2/search
   */
  search = async (req: AuthRequest, res: Response): Promise<void> => {
    const { q, campus, limit, interests, hours } = req.query;
    const user = req.user;

    // Default campus to user's campus
    const searchCampus = (campus as string) || user?.userProfile?.university || 'all';
    const searchLimit = Math.min(parseInt(limit as string) || 20, 100);

    // Build filters
    const filters: any = {};

    if (interests && typeof interests === 'string') {
      filters.interests = interests.split(',').map(i => i.trim());
    }

    if (hours && typeof hours === 'string') {
      const hoursNum = parseInt(hours);
      if (!isNaN(hoursNum) && hoursNum > 0) {
        const cutoffTime = Math.floor(Date.now() / 1000) - (hoursNum * 3600);
        filters.time_window = cutoffTime;
      }
    }

    // Perform search
    const result = await this.searchService.search(
      {
        query: q as string,
        campus: searchCampus,
        limit: searchLimit,
        filters
      },
      user
    );

    res.status(200).json({
      success: true,
      data: result
    });
  };

  /**
   * Invalidate search cache for a campus
   * POST /api/v2/search/invalidate
   */
  invalidateCache = async (req: AuthRequest, res: Response): Promise<void> => {
    const { campus } = req.body;

    await this.searchService.invalidateCache(campus);

    res.status(200).json({
      success: true,
      message: `Cache invalidated for ${campus}`
    });
  };
}
