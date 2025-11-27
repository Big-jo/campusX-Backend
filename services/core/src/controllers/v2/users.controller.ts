import { Request, Response } from 'express';
import { UsersService } from '../../services/v2/users.service';
import { FollowerSuggestionsService } from '../../services/v2/follower-suggestions.service';
import { UnauthorizedError } from '../../errors';

export class UsersController {
  private usersService: UsersService;
  private suggestionsService: FollowerSuggestionsService;

  constructor() {
    this.usersService = new UsersService();
    this.suggestionsService = new FollowerSuggestionsService();
  }

  getInterests = async (req: Request, res: Response) => {
    const result = await this.usersService.getInterests();
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/users/me
   * Get current user profile
   */
  getCurrentUser = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.usersService.getCurrentUser(userId.toString());
    return res.status(200).json(result);
  };

  /**
   * PUT /api/v2/users/profile
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const result = await this.usersService.updateProfile(userId.toString(), req.body);
    return res.status(200).json(result);
  };

  /**
   * PUT /api/v2/users/interests
   * Save user interests
   */
  saveInterests = async (req: Request, res: Response) => {
    const { topicIds } = req.body;
    const result = await this.usersService.saveInterests(req.user._id.toString(), topicIds);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/users/suggestions
   * Get follower suggestions
   */
  getSuggestions = async (req: Request, res: Response) => {
    const user = req.user;
    
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (parseInt(req.query.page as string) - 1) * limit || 0;
    const refresh = req.query.refresh === 'true';

    const result = await this.suggestionsService.getUserSuggestions(
      user,
      Math.min(limit, 50), // Cap at 50
      Math.max(offset, 0),
      refresh
    );

    return res.status(200).json(result);
  };
}
