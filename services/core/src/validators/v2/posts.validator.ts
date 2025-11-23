import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    text: z.string().max(5000).optional(),
    hashTags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
    parentPost: z.string().optional(), // For comments
    circleID: z.string().optional(), // For circle posts
  }).refine(
    (data) => data.text || data.parentPost || data.circleID,
    { message: "Post must have text, or be a comment/circle post" }
  ),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getPostSchema = z.object({
  params: z.object({
    postId: z.string().min(1, 'Post ID is required'),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const deletePostSchema = z.object({
  params: z.object({
    postId: z.string().min(1, 'Post ID is required'),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const likePostSchema = z.object({
  params: z.object({
    postId: z.string().min(1, 'Post ID is required'),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const downvotePostSchema = z.object({
  params: z.object({
    postId: z.string().min(1, 'Post ID is required'),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getUserPostsSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
  query: z.object({
    type: z.enum(['all', 'posts', 'comments']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }).optional(),
  body: z.object({}).optional(),
});

export const getNewsfeedSchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    cursor: z.string().optional(),
  }).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const pollNewsfeedSchema = z.object({
  query: z.object({
    since: z.string().regex(/^\d+$/).optional(),
    timeout: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getPostsSchema = z.object({
  query: z.object({
    type: z.enum(['post', 'comment', 'circlePost']).optional(),
    parentPost: z.string().optional(),
    circleID: z.string().optional(),
    userId: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    skip: z.string().regex(/^\d+$/).optional(),
  }).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type GetPostInput = z.infer<typeof getPostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type LikePostInput = z.infer<typeof likePostSchema>;
export type DownvotePostInput = z.infer<typeof downvotePostSchema>;
export type GetUserPostsInput = z.infer<typeof getUserPostsSchema>;
export type GetNewsfeedInput = z.infer<typeof getNewsfeedSchema>;
export type PollNewsfeedInput = z.infer<typeof pollNewsfeedSchema>;
export type GetPostsInput = z.infer<typeof getPostsSchema>;
