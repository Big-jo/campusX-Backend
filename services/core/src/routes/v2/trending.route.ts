/**
 * Trending Routes
 *
 * Endpoints:
 * - GET /api/v2/trending - Get trending posts
 */

import { Router } from 'express';
import { TrendingController } from '../../controllers/v2/trending.controller';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { trendingSchema } from '../../validators/v2/trending.validator';

const router = Router();
const trendingController = new TrendingController();

// All routes require authentication

// Get trending posts
router.get('/', auth, validate(trendingSchema), asyncHandler(trendingController.getTrending));

export default router;
