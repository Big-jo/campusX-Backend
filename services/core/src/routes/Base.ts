import { Router } from 'express';
import UserRouter from './users/Users.route';
import PostRouter from './posts/Post.route';
import StoreRouter from './stores/Store.route';
import CirclesRouter from './circles/Circles.route';
import campusRouter from './campus/campus.route';
import merchantRouter from './merchant/Merchant.route';
import searchRouter from './search/search.route';
import NotificationRouter from './notifcations/notifications.route';
import { noConflict } from 'lodash';

import FcmRouter from './fcm/fcm.route';
import v2Router from './v2';

// Init router and path
const router = Router();
const path = '/api/v1';

// Add sub-routes
router.use('/fcm', FcmRouter);
router.use(UserRouter.path, UserRouter.router);
router.use(PostRouter.path, PostRouter.router);
router.use(searchRouter.path, searchRouter.router);
router.use(StoreRouter.path, StoreRouter.router);
router.use(CirclesRouter.path, CirclesRouter.router);
router.use(campusRouter.path, campusRouter.router);
router.use(merchantRouter.path, merchantRouter.router);
router.use(NotificationRouter.path, NotificationRouter.router);

// V2 routes
const v2Path = '/api/v2';
const v2BaseRouter = Router();
v2BaseRouter.use(v2Path, v2Router);

// Export the base-router
export default { router, path, v2: { router: v2BaseRouter, path: '' } };
