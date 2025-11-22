import { IUser } from '@interfaces';
import { S3 } from '@lib';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors';
import { FollowerRepository } from '../../repositories/FollowerRepository';
import { PostRepository } from '../../repositories/PostRepository';
import { NewsfeedService } from './newsfeed.service';
import { KarmaService } from './karma.service';
import { getQueue } from '../../lib/Queue';
import type { OneSignalJobData } from '../../jobs/send-onesignal.job';
import { UsersService } from './users.service';
import { User } from '../../entities/User';
import { natsClient } from '../../lib/nats';

interface CreatePostData {
  text?: string;
  image?: string; // Legacy single image URL
  video?: string; // Legacy single video URL
  imageFile?: Express.Multer.File;
  videoFile?: Express.Multer.File;
  imageFiles?: Express.Multer.File[]; // Multiple images
  videoFiles?: Express.Multer.File[]; // Multiple videos
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
  private karmaService: KarmaService;
  private userService: UsersService;

  constructor() {
    this.postRepo = new PostRepository();
    this.newsfeedService = new NewsfeedService();
    this.followerRepo = new FollowerRepository();
    this.karmaService = new KarmaService();
    this.userService = new UsersService();
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

    // Build parallel upload tasks
    const uploads: Promise<string>[] = [];

    // Multiple images
    const imageFiles = postData.imageFiles || (postData.imageFile ? [postData.imageFile] : []);

    imageFiles.forEach((file, idx) => {
      uploads.push(new S3(`${tempPostId}_img_${idx}`, file, 'image').UploadImage() as Promise<string>);
    });

    // Multiple videos
    const videoFiles = postData.videoFiles || (postData.videoFile ? [postData.videoFile] : []);
    videoFiles.forEach((file, idx) => {
      uploads.push(new S3(`${tempPostId}_vid_${idx}`, file, 'video').UploadVideo() as Promise<string>);
    });

    // Execute all uploads in parallel
    const uploadedUrls = uploads.length ? await Promise.all(uploads) : [];

    const imageUrls = uploadedUrls.slice(0, imageFiles.length);
    const videoUrls = uploadedUrls.slice(imageFiles.length);

    // Create post with type
    const post = await this.postRepo.createPost({
      author: user._id,
      type,
      text: postData.text || '',
      images: imageUrls,
      videos: videoUrls,
      image: imageUrls[0] || postData.image || null, // Legacy
      video: videoUrls[0] || postData.video || null, // Legacy
      campus: user.userProfile.university,
      parentPost: postData.parentPost || undefined,
      circleID: postData.circleID ? mongoose.Types.ObjectId(postData.circleID) : undefined,
      hashTags: postData.text ? postData.text.match(/#(\w+)/g)?.map(tag => tag.substring(1)) : [],
      mentions: postData.text ? postData.text.match(/@(\w+)/g)?.map(mention => mention.substring(1)) : [],
      likes: 0,
      comments: 0,
      dislikes: 0,
      trash: 0,
      createdAt: Date.now(),
      likedBy: []
    } as any);

    // Award karma for content creation
    //TODO: Send notification for mentions
    if (type === 'post') {
      await this.karmaService.awardPostCreation(userId);
      // Only fan-out regular posts (not comments or circle posts)
      this.newsfeedService.fanOutPost(post._id.toString(), userId).catch(err => {
        console.error('Fan-out failed:', err);
        // TODO: Queue for retry
      });

      // Publish to NATS for ML embeddings (fire-and-forget)
      if (natsClient.isConnected()) {
        natsClient.publishPostCreated({
          post_id: post._id.toString(),
          text: post.text || '',
          campus: post.campus || '',
          author_id: user._id.toString(),
          created_at: post.createdAt, // Convert to unix timestamp
          hashtags: post.hashTags || []
        }).catch(err => {
          console.error('Failed to publish post.created event to NATS:', err);
          // Non-critical - embeddings can be backfilled later
        });
      }
    } else if (type === 'comment') {
      await this.karmaService.awardCommentCreation(userId);
      if (postData.parentPost) {
        // Increment parent's comment count
        await this.postRepo.incrementCommentCount(postData.parentPost);

        // Queue comment notification
        try {
          const parentPost = await this.postRepo.findById(postData.parentPost);
          if (parentPost && parentPost.author.toString() !== userId) {
            const notificationQueue = getQueue('send-onesignal');
            await notificationQueue.add('comment-notification', {
              recipientId: parentPost.author.toString(),
              actorId: userId,
              category: 'comment',
              title: 'New comment on your post',
              body: postData.text || 'Media',
              data: { postId: parentPost._id.toString(), commentId: post._id.toString() }
            } as OneSignalJobData);
          }
        } catch (error) {
          console.error('Failed to queue comment notification:', error);
        }
      }
    }

    const mentions = post.mentions
    for (const mention of mentions) {
      const userTag = mention;
      const mentionedUser = await this.userService.findUsersByTag(userTag);

      if (mentionedUser && mentionedUser._id.toString() !== userId) {
        // Queue mention notification
        try {
          const notificationQueue = getQueue('send-onesignal');
          await notificationQueue.add('mention-notification', {
            recipientId: mentionedUser._id.toString(),
            actorId: userId,
            category: 'mention',
            title: `@${user.userTag} mentioned you`,
            body: post.text || 'Media', //Try and show media preview if possible
            data: { postId: post._id.toString() }
          } as OneSignalJobData);
        } catch (error) {
          console.error('Failed to queue mention notification:', error);
        }
      }
    }

    return {
      data: {
        post: {
          id: post._id,
          type: post.type,
          text: post.text,
          images: post.images,
          videos: post.videos,
          image: post.image, // Legacy
          video: post.video, // Legacy
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

    // Award karma to post author
    await this.karmaService.awardLikeReceived(post.author);

    // Queue OneSignal notification
    try {
      const notificationQueue = getQueue('send-onesignal');
      await notificationQueue.add('like-notification', {
        recipientId: post.author.toString(),
        actorId: userId,
        category: 'like',
        title: 'New like on your post',
        body: post.text || 'Media',
        data: { postId: post._id.toString() }
      } as OneSignalJobData);
    } catch (error) {
      console.error('Failed to queue like notification:', error);
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

    // Remove karma from post author
    await this.karmaService.removeLikeReceived(post.author);

    return {
      data: {
        postId: post._id,
        likes: post.likes
      },
      message: 'Post unliked successfully'
    };
  }

  /**
   * Downvote a post
   */
  async downvotePost(postId: string, userId: string): Promise<any> {
    // Check if already downvoted
    const hasDisliked = await this.postRepo.hasDisliked(postId, userId);

    if (hasDisliked) {
      throw new BadRequestError('Post already downvoted');
    }

    // Add downvote
    const post = await this.postRepo.addDislike(postId, userId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Deduct karma from post author
    await this.karmaService.awardDownvote(post.author);

    return {
      data: {
        postId: post._id,
        dislikes: post.dislikes
      },
      message: 'Post downvoted successfully'
    };
  }

  /**
   * Remove downvote from a post
   */
  async removeDownvote(postId: string, userId: string): Promise<any> {
    // Check if downvoted
    const hasDisliked = await this.postRepo.hasDisliked(postId, userId);

    if (!hasDisliked) {
      throw new BadRequestError('Post not downvoted');
    }

    // Remove downvote
    const post = await this.postRepo.removeDislike(postId, userId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Restore karma to post author
    await this.karmaService.removeDownvote(post.author);

    return {
      data: {
        postId: post._id,
        dislikes: post.dislikes
      },
      message: 'Downvote removed successfully'
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
    if (filters.circleID) query.circleID = mongoose.Types.ObjectId(filters.circleID);
    if (filters.userId) query.author = mongoose.Types.ObjectId(filters.userId);

    const posts = await this.postRepo.find(query, null, {
      limit: filters.limit || 50,
      skip: filters.skip || 0,
      sort: { createdAt: -1 }
    });

    return posts;
  }
}
