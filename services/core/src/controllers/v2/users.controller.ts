import { Request, Response } from 'express';
import { UsersService } from '../../services/v2/users.service';
import { UnauthorizedError } from '../../errors';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
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
}
