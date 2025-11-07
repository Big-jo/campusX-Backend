import { Request, Response } from 'express';
import { UsersService } from '../../services/v2/users.service';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  getInterests = async (req: Request, res: Response) => {
    try {
      const result = await this.usersService.getInterests();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching interests:', error);
      return res.status(500).json({
        error: 'Failed to fetch interests',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * GET /api/v2/users/me
   * Get current user profile
   */
  getCurrentUser = async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const result = await this.usersService.getCurrentUser(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching current user:', error);

      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({
          error: 'User not found',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * PUT /api/v2/users/profile
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const result = await this.usersService.updateProfile(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error updating profile:', error);

      if (error instanceof Error && error.message === 'Failed to update user profile') {
        return res.status(400).json({
          error: 'Failed to update profile',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * PUT /api/v2/users/interests
   * Save user interests
   */
  saveInterests = async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      const { topicIds } = req.body;
      const result = await this.usersService.saveInterests(userId, topicIds);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error saving interests:', error);

      if (error instanceof Error && error.message.startsWith('Invalid topic IDs')) {
        return res.status(400).json({
          error: 'Invalid topic IDs',
          message: error.message
        });
      }

      if (error instanceof Error && error.message === 'Failed to save interests') {
        return res.status(400).json({
          error: 'Failed to save interests',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to save interests',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
