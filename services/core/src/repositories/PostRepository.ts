// @ts-nocheck
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
   * Add user to post's dislikedBy array
   * @param postId - Post ID
   * @param userId - User ID
   * @returns Updated post
   */
  async addDislike(postId: string, userId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $addToSet: { dislikedBy: new mongoose.Types.ObjectId(userId) },
      $inc: { dislikes: 1 }
    });
  }

  /**
   * Remove user from post's dislikedBy array
   * @param postId - Post ID
   * @param userId - User ID
   * @returns Updated post
   */
  async removeDislike(postId: string, userId: string): Promise<IPostModel | null> {
    return this.updateById(postId, {
      $pull: { dislikedBy: new mongoose.Types.ObjectId(userId) } as any,
      $inc: { dislikes: -1 }
    });
  }

  /**
   * Check if user has disliked a post
   * @param postId - Post ID
   * @param userId - User ID
   * @returns True if disliked, false otherwise
   */
  async hasDisliked(postId: string, userId: string): Promise<boolean> {
    const post = await this.findById(postId, { dislikedBy: 1 });
    if (!post) return false;

    return post.dislikedBy.some(
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

  /**
   * Find posts by type with optional filters
   * @param type - Post type ('post' | 'comment' | 'circlePost')
   * @param filters - Additional query filters
   * @param options - Query options (sort, limit, skip)
   * @returns Array of posts matching criteria
   */
  async findByType(
    type: 'post' | 'comment' | 'circlePost',
    filters: any = {},
    options: any = {}
  ): Promise<IPostModel[]> {
    const query = { type, ...filters };
    return this.find(query, null, {
      sort: options.sort || { createdAt: -1 },
      limit: options.limit || 50,
      skip: options.skip || 0
    });
  }

  /**
   * Find comments for a post (including nested replies)
   * @param parentId - Parent post or comment ID
   * @param options - Pagination and sorting options
   * @returns Array of comments
   */
  async findComments(
    parentId: string,
    options: { limit?: number; skip?: number; sort?: any } = {}
  ): Promise<IPostModel[]> {
    return this.findByType('comment', { parentPost: parentId }, options);
  }

  /**
   * Find posts for a specific circle
   * @param circleId - Circle ID
   * @param options - Pagination and sorting options
   * @returns Array of circle posts
   */
  async findCirclePosts(
    circleId: string,
    options: { limit?: number; skip?: number; sort?: any } = {}
  ): Promise<IPostModel[]> {
    return this.findByType('circlePost', { circleID: new mongoose.Types.ObjectId(circleId) }, options);
  }

  /**
   * Delete post and cascade delete all child comments
   * @param postId - Post ID to delete
   * @returns Deletion result
   */
  async deleteWithChildren(postId: string): Promise<any> {
    // Find all child comments (comments with this post as parent)
    const children = await this.find({ parentPost: postId });

    // Recursively delete children's children
    //TODO: Optimise since this can be expensive for deep trees
    for (const child of children) {
      await this.deleteWithChildren(child._id.toString());
    }

    // Delete the post itself
    return this.deleteById(postId);
  }

  /**
   * Search posts by text query (MongoDB full-text search)
   * @param query - Search query
   * @param campus - Campus filter
   * @param limit - Max results
   * @returns Array of posts
   */
  async searchByText(query: string, campus: string, limit: number = 20): Promise<IPostModel[]> {
    return this.find({
      $text: { $search: query },
      campus,
      type: 'post'
    }).limit(limit).sort({ score: { $meta: 'textScore' } });
  }

  /**
   * Populate author details for posts
   * @param posts - Array of posts
   * @returns Posts with populated author
   */
  async populateAuthor(posts: IPostModel[]): Promise<any[]> {
    return PostModel.populate(posts, {
      path: 'author',
      select: 'name userTag userProfile.avatar userProfile.university'
    });
  }
}
