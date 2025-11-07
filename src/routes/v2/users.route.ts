import { Router } from 'express';
import { UsersController } from '../../controllers/v2/users.controller';
import { validate } from '../../middleware/validation';
import {
  getUserInterestsSchema,
  updateUserProfileSchema,
  saveUserInterestsSchema
} from '../../validators/v2/users.validator';
import { auth } from '../../middleware/auth';

const router = Router();
const usersController = new UsersController();

// Public routes
router.get('/interests', validate(getUserInterestsSchema), usersController.getInterests);

// Protected routes (require authentication)
router.get('/me', auth, usersController.getCurrentUser);
router.put('/profile', auth, validate(updateUserProfileSchema), usersController.updateProfile);
router.put('/interests', auth, validate(saveUserInterestsSchema), usersController.saveInterests);

export default router;
