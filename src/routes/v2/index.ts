import { Router } from 'express';
import usersRoute from './users.route';
import campusRoute from './campus.route';

const router = Router();

router.use('/users', usersRoute);
router.use('/campus', campusRoute);

export default router;
