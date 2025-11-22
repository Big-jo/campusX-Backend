import { Router } from 'express';
import usersRoute from './users.route';
import campusRoute from './campus.route';
import postsRoute from './posts.route';
import searchRoute from './search.route';
import trendingRoute from './trending.route';
import { errorHandler } from '../../middleware/errorHandler';

const router = Router();

router.use('/users', usersRoute);
router.use('/campus', campusRoute);
router.use('/posts', postsRoute);
router.use('/search', searchRoute);
router.use('/trending', trendingRoute);

// Error handler middleware must be last
router.use(errorHandler);

export default router;
