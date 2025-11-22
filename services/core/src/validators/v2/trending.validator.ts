import { z } from 'zod';

export const trendingSchema = z.object({
  query: z.object({
    campus: z.string().optional(),
    timeWindow: z.enum(['6h', '24h', '7d']).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});
