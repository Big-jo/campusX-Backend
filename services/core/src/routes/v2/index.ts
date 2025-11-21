import { Router } from 'express';
import usersRoute from './users.route';
import campusRoute from './campus.route';
import postsRoute from './posts.route';
import { errorHandler } from '../../middleware/errorHandler';

const router = Router();

router.use('/users', usersRoute);
router.use('/campus', campusRoute);
router.use('/posts', postsRoute);

// Error handler middleware must be last
router.use(errorHandler);

export default router;
