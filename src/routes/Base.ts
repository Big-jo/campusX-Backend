import { Router } from 'express';
import UserRouter from './users/Users.route';
import PostRouter from './posts/Post.route';
import StoreRouter from './stores/Store.route';
import CirclesRouter from './circles/Circles.route';
import campusRouter from './campus/campus.route';
import merchantRouter from './merchant/Merchant.route';
import searchRouter from './search/search.route';

// Init router and path
const router = Router();
const path = '/api/v1';

// Add sub-routes
router.use(UserRouter.path, UserRouter.router);
router.use(PostRouter.path, PostRouter.router);
router.use(searchRouter.path, searchRouter.router);
router.use(StoreRouter.path, StoreRouter.router);
router.use(CirclesRouter.path, CirclesRouter.router);
router.use(campusRouter.path, campusRouter.router);
router.use(merchantRouter.path, merchantRouter.router);

// Export the base-router
export default { router, path };
