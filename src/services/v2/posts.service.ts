import { PostRepository } from '../../repositories/PostRepository';
import { NewsfeedService } from './newsfeed.service';
import { FollowerRepository } from '../../repositories/FollowerRepository';
import { NotFoundError, ValidationError, BadRequestError } from '../../errors';
import { IPostModel } from '../../interfaces/IPost';
import mongoose from 'mongoose';
import { User } from '@entities/User';
import { IUser } from '@interfaces';
import { S3 } from '@lib';

interface CreatePostData {
  text?: string;
  image?: string;
  video?: string;
  imageFile?: Express.Multer.File;
  videoFile?: Express.Multer.File;
  campus?: string;
  hashTags?: string[];
  mentions?: string[];
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
   * Create a new post and fan out to followers
   */
  async createPost(postData: CreatePostData, user: IUser): Promise<any> {
    const userId = user._id.toString();


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

    // Create post
    const post = await this.postRepo.createPost({
      author: user._id,
      text: postData.text || '',
      image: imageUrl,
      video: videoUrl,
      campus: user.userProfile.university,
      hashTags: postData.hashTags || [],
      mentions: postData.mentions || [],
      likes: 0,
      comments: 0,
      dislikes: 0,
      trash: 0,
      createdAt: Date.now(),
      likedBy: []
    } as any);
    // Trigger fan-out (async - don't block response)
    this.newsfeedService.fanOutPost(post._id.toString(), userId).catch(err => {
      console.error('Fan-out failed:', err);
      // TODO: Queue for retry
    });

    return {
      data: {
        post: {
          id: post._id,
          text: post.text,
          image: post.image,
          video: post.video,
          campus: post.campus,
          hashTags: post.hashTags,
          likes: post.likes,
          comments: post.comments,
          createdAt: post.createdAt
        }
      },
      message: 'Post created successfully'
    };
  }

  /**
   * Delete a post and remove from all timelines
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

    // Delete from MongoDB
    await this.postRepo.deleteById(postId);

    // Remove from all timelines (async)
    this.newsfeedService.removeFanOut(postId, userId).catch(err => {
      console.error('Remove fan-out failed:', err);
    });
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
        posts: result.docs || [],
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
}
