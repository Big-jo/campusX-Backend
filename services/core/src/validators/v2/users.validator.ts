import { z } from 'zod';

export const getUserInterestsSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    university: z.string().optional(),
    course: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    level: z.number().int().min(100).max(800).optional(),
    phoneNumber: z.number().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
    userTag: z.string().min(3).max(30),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const saveUserInterestsSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).min(1, 'At least one topic is required')
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export type GetUserInterestsInput = z.infer<typeof getUserInterestsSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SaveUserInterestsInput = z.infer<typeof saveUserInterestsSchema>;
