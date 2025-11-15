import { BaseRepository } from './BaseRepository';
import PostModel from '../models/Post.model';
import { IPostModel } from '../interfaces/IPost';
import { AggregationQueries } from '../lib/aggregationQueries';
import mongoose from 'mongoose';

export class PostRepository extends BaseRepository<IPostModel> {
  constructor() {
    super(PostModel);
  }

  /**
   * Find posts by array of IDs with author details and isLiked flag
   * @param postIds - Array of post IDs
   * @param userId - Current user ID (for isLiked calculation)
   * @returns Hydrated posts with author info
   */
  async findWithAuthor(postIds: string[], userId: string): Promise<any[]> {
    const objectIds = postIds.map(id => new mongoose.Types.ObjectId(id));
    return AggregationQueries.NewsfeedPostAggreg(userId, objectIds);
  }

  /**
   * Find posts by multiple IDs (simple lookup without aggregation)
   * @param ids - Array of post IDs
   * @returns Array of posts
   */
  async findByIds(ids: string[]): Promise<IPostModel[]> {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return this.find({ _id: { $in: objectIds } });
  }

  /**
   * Find posts by author with pagination
   * @param authorId - Author user ID
   * @param postType - Type of posts (video, image, text, or all)
   * @param options - Pagination options
   * @returns Paginated posts
   */
  async findByAuthor(
    authorId: string,
    postType: string = 'all',
    options: { page: number; limit: number } = { page: 1, limit: 50 }
  ): Promise<any> {
    return AggregationQueries.GetUserPostsAggreg(authorId, postType, options);
  }

  /**
   * Create a new post
   * @param postData - Post data
   * @returns Created post
   */
  async createPost(postData: Partial<IPostModel>): Promise<IPostModel> {
    return this.create(postData);
  }

  /**
   * Add user to post's likedBy array
   * @param postId - Post ID
   * @param userId - User ID
   * @returns Updated post
   */
  async addLike(postId: string, userId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $addToSet: { likedBy: new mongoose.Types.ObjectId(userId) },
      $inc: { likes: 1 }
    });
  }

  /**
   * Remove user from post's likedBy array
   * @param postId - Post ID
   * @param userId - User ID
   * @returns Updated post
   */
  async removeLike(postId: string, userId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $pull: { likedBy: new mongoose.Types.ObjectId(userId) } as any,
      $inc: { likes: -1 }
    });
  }

  /**
   * Check if user has liked a post
   * @param postId - Post ID
   * @param userId - User ID
   * @returns True if liked, false otherwise
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const post = await this.findById(postId, { likedBy: 1 });
    if (!post) return false;

    return post.likedBy.some(
      (id: mongoose.Types.ObjectId) => id.toString() === userId
    );
  }

  /**
   * Increment comment count for a post
   * @param postId - Post ID
   * @returns Updated post
   */
  async incrementCommentCount(postId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $inc: { comments: 1 }
    });
  }

  /**
   * Decrement comment count for a post
   * @param postId - Post ID
   * @returns Updated post
   */
  async decrementCommentCount(postId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $inc: { comments: -1 }
    });
  }

  /**
   * Get posts by campus
   * @param campus - Campus ID
   * @param limit - Number of posts to return
   * @returns Array of posts
   */
  async findByCampus(campus: string, limit: number = 50): Promise<IPostModel[]> {
    return this.find({ campus }, null, { limit, sort: { createdAt: -1 } });
  }
}
