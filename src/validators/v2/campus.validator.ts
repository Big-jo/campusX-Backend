import { z } from 'zod';

export const getAllCampusesSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getCampusByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Campus ID is required'),
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const searchCampusesSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export type GetAllCampusesInput = z.infer<typeof getAllCampusesSchema>;
export type GetCampusByIdInput = z.infer<typeof getCampusByIdSchema>;
export type SearchCampusesInput = z.infer<typeof searchCampusesSchema>;
