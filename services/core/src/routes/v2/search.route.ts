/**
 * Semantic Search Routes
 *
 * Endpoints:
 * - GET /api/v2/search - Semantic search for posts
 * - POST /api/v2/search/invalidate - Cache invalidation
 */

import { Router } from 'express';
import { SearchController } from '../../controllers/v2/search.controller';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { searchSchema, invalidateCacheSchema } from '../../validators/v2/search.validator';

const router = Router();
const searchController = new SearchController();

// All routes require authentication

// Search posts
router.get('/', auth, validate(searchSchema), asyncHandler(searchController.search));

// Invalidate cache (admin/utility endpoint)
router.post('/invalidate', auth, validate(invalidateCacheSchema), asyncHandler(searchController.invalidateCache));

export default router;
