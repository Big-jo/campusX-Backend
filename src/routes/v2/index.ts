import { Router } from 'express';
import usersRoute from './users.route';
import campusRoute from './campus.route';
import { errorHandler } from '../../middleware/errorHandler';

const router = Router();

router.use('/users', usersRoute);
router.use('/campus', campusRoute);

// Error handler middleware must be last
router.use(errorHandler);

export default router;
