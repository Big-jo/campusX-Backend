import { Router } from 'express';
import multer from 'multer';
import { PostsController } from '../../controllers/v2/posts.controller';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createPostSchema,
  deletePostSchema,
  getNewsfeedSchema,
  getPostSchema,
  getUserPostsSchema,
  likePostSchema,
  pollNewsfeedSchema
} from '../../validators/v2/posts.validator';

const router = Router();
const postsController = new PostsController();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// All routes require authentication

// Newsfeed routes
router.get('/newsfeed', auth, validate(getNewsfeedSchema), asyncHandler(postsController.getNewsfeed));
router.get('/newsfeed/poll', auth, validate(pollNewsfeedSchema), asyncHandler(postsController.pollNewsfeed));

// Post CRUD routes
router.post('/create', auth, upload.fields([{ name: 'image', maxCount: 4 }, { name: 'video', maxCount: 4 }]), validate(createPostSchema), asyncHandler(postsController.createPost));

// Unified query endpoint (must be BEFORE /:postId to avoid route collision)
router.get('/', auth, validate(getPostsSchema), asyncHandler(postsController.getPosts));

router.get('/:postId', auth, validate(getPostSchema), asyncHandler(postsController.getPost));
router.delete('/:postId', auth, validate(deletePostSchema), asyncHandler(postsController.deletePost));

// Post interactions
router.post('/:postId/like', auth, validate(likePostSchema), asyncHandler(postsController.likePost));
router.delete('/:postId/like', auth, validate(likePostSchema), asyncHandler(postsController.unlikePost));

// User posts
router.get('/users/:userId', auth, validate(getUserPostsSchema), asyncHandler(postsController.getUserPosts));

export default router;
