import { Router } from 'express';
import { PostsController } from '../../controllers/v2/posts.controller';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
const postsController = new PostsController();

// All routes require authentication

// Newsfeed routes
router.get('/newsfeed', auth, asyncHandler(postsController.getNewsfeed));
router.get('/newsfeed/poll', auth, asyncHandler(postsController.pollNewsfeed));

// Post CRUD routes
router.post('/create', auth, asyncHandler(postsController.createPost));
router.get('/:postId', auth, asyncHandler(postsController.getPost));
router.delete('/:postId', auth, asyncHandler(postsController.deletePost));

// Post interactions
router.post('/:postId/like', auth, asyncHandler(postsController.likePost));
router.delete('/:postId/like', auth, asyncHandler(postsController.unlikePost));

// User posts
router.get('/users/:userId/posts', auth, asyncHandler(postsController.getUserPosts));

export default router;
