import { Request, Response } from 'express';
import { PostsService } from '../../services/v2/posts.service';
import { NewsfeedService } from '../../services/v2/newsfeed.service';
import { UnauthorizedError } from '../../errors';

export class PostsController {
  private postsService: PostsService;
  private newsfeedService: NewsfeedService;

  constructor() {
    this.postsService = new PostsService();
    this.newsfeedService = new NewsfeedService();
  }

  /**
   * POST /api/v2/posts/create
   * Create a new post
   */
  createPost = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.postsService.createPost(req.body, userId);
    return res.status(201).json(result);
  };

  /**
   * DELETE /api/v2/posts/:postId
   * Delete a post
   */
  deletePost = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    await this.postsService.deletePost(postId, userId);
    return res.status(200).json({ message: 'Post deleted successfully' });
  };

  /**
   * POST /api/v2/posts/:postId/like
   * Like a post
   */
  likePost = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.postsService.likePost(postId, userId);
    return res.status(200).json(result);
  };

  /**
   * DELETE /api/v2/posts/:postId/like
   * Unlike a post
   */
  unlikePost = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.postsService.unlikePost(postId, userId);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/posts/:postId
   * Get a single post
   */
  getPost = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.postsService.getPost(postId, userId);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/newsfeed
   * Get user's newsfeed (paginated)
   */
  getNewsfeed = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const result = await this.newsfeedService.getFeed(userId, limit, cursor);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/newsfeed/poll
   * Long polling endpoint for real-time updates
   */
  pollNewsfeed = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const since = parseInt(req.query.since as string) || 0;
    const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await this.newsfeedService.pollFeed(userId, since, timeout, limit);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/users/:userId/posts
   * Get user's posts
   */
  getUserPosts = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { userId: targetUserId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const postType = (req.query.type as string) || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await this.postsService.getUserPosts(
      targetUserId,
      userId,
      postType,
      page,
      limit
    );
    return res.status(200).json(result);
  };
}
