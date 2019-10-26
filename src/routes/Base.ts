import { Router } from 'express';
import UserRouter from './users/Users';
import PostRouter from './posts/Post';
// Init router and path
const router = Router();
const path = '/api/v1';

// Add sub-routes
router.use(UserRouter.path, UserRouter.router);
router.use(PostRouter.path, PostRouter.router);

// Export the base-router
export default { router, path };
