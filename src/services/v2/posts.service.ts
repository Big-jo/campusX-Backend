import { IUser } from '@interfaces';
import { S3 } from '@lib';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors';
import { FollowerRepository } from '../../repositories/FollowerRepository';
import { PostRepository } from '../../repositories/PostRepository';
import { NewsfeedService } from './newsfeed.service';

interface CreatePostData {
  text?: string;
  image?: string;
  video?: string;
  imageFile?: Express.Multer.File;
  videoFile?: Express.Multer.File;
  campus?: string;
  hashTags?: string[];
  mentions?: string[];
  parentPost?: string; // For comments
  circleID?: string; // For circle posts
}

export class PostsService {
  private postRepo: PostRepository;
  private newsfeedService: NewsfeedService;
  private followerRepo: FollowerRepository;

  constructor() {
    this.postRepo = new PostRepository();
    this.newsfeedService = new NewsfeedService();
    this.followerRepo = new FollowerRepository();
  }

  /**
   * Create a new post/comment/circle post (unified endpoint)
   * Auto-detects type based on parentPost and circleID fields
   */
  async createPost(postData: CreatePostData, user: IUser): Promise<any> {
    const userId = user._id.toString();

    // Auto-detect type based on request data
    let type: 'post' | 'comment' | 'circlePost' = 'post';
    if (postData.parentPost) {
      type = 'comment';
    } else if (postData.circleID) {
      type = 'circlePost';
    }

    // Generate temporary post ID for file uploads
    const tempPostId = new mongoose.Types.ObjectId().toString();

    // Upload files to S3 if provided
    let imageUrl = postData.image || null;
    let videoUrl = postData.video || null;

    if (postData.imageFile) {
      const s3 = new S3(tempPostId + 'image', postData.imageFile, 'image');
      imageUrl = (await s3.UploadImage()) as string;
    }

    if (postData.videoFile) {
      const s3 = new S3(tempPostId + 'video', postData.videoFile, 'video');
      videoUrl = (await s3.UploadVideo()) as string;
    }

    // Create post with type
    const post = await this.postRepo.createPost({
      author: user._id,
      type,
      text: postData.text || '',
      image: imageUrl,
      video: videoUrl,
      campus: user.userProfile.university,
      parentPost: postData.parentPost || undefined,
      circleID: postData.circleID ? new mongoose.Types.ObjectId(postData.circleID) : undefined,
      hashTags: postData.hashTags || [],
      mentions: postData.mentions || [],
      likes: 0,
      comments: 0,
      dislikes: 0,
      trash: 0,
      createdAt: Date.now(),
      likedBy: []
    } as any);

    // Conditional actions based on type
    if (type === 'post') {
      // Only fan-out regular posts (not comments or circle posts)
      this.newsfeedService.fanOutPost(post._id.toString(), userId).catch(err => {
        console.error('Fan-out failed:', err);
        // TODO: Queue for retry
      });
    } else if (type === 'comment' && postData.parentPost) {
      // Increment parent's comment count
      await this.postRepo.incrementCommentCount(postData.parentPost);
    }

    return {
      data: {
        post: {
          id: post._id,
          type: post.type,
          text: post.text,
          image: post.image,
          video: post.video,
          campus: post.campus,
          parentPost: post.parentPost,
          circleID: post.circleID,
          hashTags: post.hashTags,
          likes: post.likes,
          comments: post.comments,
          createdAt: post.createdAt
        }
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`
    };
  }

  /**
   * Delete a post/comment and cascade delete children
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepo.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check authorization
    if (post.author.toString() !== userId) {
      throw new BadRequestError('You can only delete your own posts');
    }

    // Delete with cascade (deletes all child comments)
    await this.postRepo.deleteWithChildren(postId);

    // Remove from all timelines if it was a post (async)
    if (post.type === 'post') {
      this.newsfeedService.removeFanOut(postId, userId).catch(err => {
        console.error('Remove fan-out failed:', err);
      });
    }

    // Decrement parent comment count if this was a comment
    if (post.type === 'comment' && post.parentPost) {
      await this.postRepo.decrementCommentCount(post.parentPost);
    }
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string): Promise<any> {
    // Check if already liked
    const hasLiked = await this.postRepo.hasLiked(postId, userId);

    if (hasLiked) {
      throw new BadRequestError('Post already liked');
    }

    // Add like
    const post = await this.postRepo.addLike(postId, userId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return {
      data: {
        postId: post._id,
        likes: post.likes
      },
      message: 'Post liked successfully'
    };
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string): Promise<any> {
    // Check if liked
    const hasLiked = await this.postRepo.hasLiked(postId, userId);

    if (!hasLiked) {
      throw new BadRequestError('Post not liked');
    }

    // Remove like
    const post = await this.postRepo.removeLike(postId, userId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return {
      data: {
        postId: post._id,
        likes: post.likes
      },
      message: 'Post unliked successfully'
    };
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string, userId: string): Promise<any> {
    const posts = await this.postRepo.findWithAuthor([postId], userId);

    if (!posts || posts.length === 0) {
      throw new NotFoundError('Post not found');
    }

    return {
      data: {
        post: posts[0]
      }
    };
  }

  /**
   * Get user's posts
   */
  async getUserPosts(
    targetUserId: string,
    userId: string,
    postType: string = 'all',
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const result = await this.postRepo.findByAuthor(targetUserId, postType, { page, limit });

    return {
      data: {
        posts: result || [],
        pagination: {
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      }
    };
  }

  /**
   * Get posts with optional filters (unified query endpoint)
   * Supports filtering by type, parentPost, circleID, userId
   */
  async getPosts(filters: {
    type?: 'post' | 'comment' | 'circlePost';
    parentPost?: string;
    circleID?: string;
    userId?: string;
    limit?: number;
    skip?: number;
  }): Promise<any> {
    const query: any = {};

    if (filters.type) query.type = filters.type;
    if (filters.parentPost) query.parentPost = filters.parentPost;
    if (filters.circleID) query.circleID = new mongoose.Types.ObjectId(filters.circleID);
    if (filters.userId) query.author = new mongoose.Types.ObjectId(filters.userId);

    const posts = await this.postRepo.find(query, null, {
      limit: filters.limit || 50,
      skip: filters.skip || 0,
      sort: { createdAt: -1 }
    });

    return posts;
  }
}
