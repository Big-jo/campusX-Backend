import { z } from 'zod';

export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Query must be at least 2 characters').max(200, 'Query too long'),
    campus: z.string().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    interests: z.string().optional(), // Comma-separated
    hours: z.string().regex(/^\d+$/).optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const invalidateCacheSchema = z.object({
  body: z.object({
    campus: z.string().min(1, 'Campus is required'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
