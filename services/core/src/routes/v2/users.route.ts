import { Router } from 'express';
import { UsersController } from '../../controllers/v2/users.controller';
import { validate } from '../../middleware/validation';
import {
  getUserInterestsSchema,
  updateUserProfileSchema,
  saveUserInterestsSchema,
  userSearchSchema
} from '../../validators/v2/users.validator';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
const usersController = new UsersController();

// Public routes
router.get('/interests', validate(getUserInterestsSchema), asyncHandler(usersController.getInterests));

// Protected routes (require authentication)
router.get('/me', auth, asyncHandler(usersController.getCurrentUser));
router.put('/profile', auth, validate(updateUserProfileSchema), asyncHandler(usersController.updateProfile));
router.put('/interests', auth, validate(saveUserInterestsSchema), asyncHandler(usersController.saveInterests));
router.get('/suggestions', auth, asyncHandler(usersController.getSuggestions));
router.get('/search', auth, validate(userSearchSchema), asyncHandler(usersController.userSearch));

export default router;
