import { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors';
import { NewsfeedService } from '../../services/v2/newsfeed.service';
import { PostsService } from '../../services/v2/posts.service';

export class PostsController {
  private postsService: PostsService;
  private newsfeedService: NewsfeedService;

  constructor() {
    this.postsService = new PostsService();
    this.newsfeedService = new NewsfeedService();
  }

  /**
   * POST /api/v2/posts/create
   * Create a new post/comment/circle post (unified endpoint)
   * Type is auto-detected based on parentPost and circleID fields
   */
  createPost = async (req: Request, res: Response) => {
    // Extract validated body data
    const { text, hashTags, mentions, parentPost, circleID } = req.body;

    // Extract files from multipart form
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.image?.[0];
    const videoFile = files?.video?.[0];

    const postData = {
      text,
      hashTags,
      mentions,
      parentPost,
      circleID,
      imageFile,
      videoFile
    };

    const result = await this.postsService.createPost(postData, req.user);
    return res.status(201).json(result);
  };

  /**
   * DELETE /api/v2/posts/:postId
   * Delete a post
   */
  deletePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    await this.postsService.deletePost(postId, req.user._id.toString());
    return res.status(200).json({ message: 'Post deleted successfully' });
  };

  /**
   * POST /api/v2/posts/:postId/like
   * Like a post
   */
  likePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const result = await this.postsService.likePost(postId, req.user._id.toString());
    return res.status(200).json(result);
  };

  /**
   * DELETE /api/v2/posts/:postId/like
   * Unlike a post
   */
  unlikePost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const result = await this.postsService.unlikePost(postId, req.user._id.toString());
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/posts/:postId
   * Get a single post
   */
  getPost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    const result = await this.postsService.getPost(postId, req.user._id.toString());
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/newsfeed
   * Get user's newsfeed (paginated)
   */
  getNewsfeed = async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const result = await this.newsfeedService.getFeed(req.user._id.toString(), limit, cursor);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/newsfeed/poll
   * Long polling endpoint for real-time updates
   */
  pollNewsfeed = async (req: Request, res: Response) => {
    const since = parseInt(req.query.since as string) || 0;
    const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await this.newsfeedService.pollFeed(req.user._id.toString(), since, timeout, limit);
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/users/:userId/posts
   * Get user's posts
   */
  getUserPosts = async (req: Request, res: Response) => {
    const { userId: targetUserId } = req.params;
    const postType = (req.query.type as string) || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await this.postsService.getUserPosts(
      targetUserId,
      req.user._id.toString(),
      postType,
      page,
      limit
    );
    return res.status(200).json(result);
  };

  /**
   * GET /api/v2/posts
   * Unified query endpoint - get posts with filters
   * Supports filtering by type, parentPost, circleID, userId
   */
  getPosts = async (req: Request, res: Response) => {
    const type = req.query.type as 'post' | 'comment' | 'circlePost' | undefined;
    const parentPost = req.query.parentPost as string | undefined;
    const circleID = req.query.circleID as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = parseInt(req.query.skip as string) || 0;

    const posts = await this.postsService.getPosts({
      type,
      parentPost,
      circleID,
      userId,
      limit,
      skip
    });

    return res.status(200).json(posts);
  };
}
