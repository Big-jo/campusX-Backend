import { Router, Response, Request } from 'express';
import PostModel from '../../models/Post.model';
import moment from 'moment';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import { logger } from '@shared';
import validation from '../../middleware/auth';
import { Post } from '../../entities/Post';
import { IComment, IPost } from '../../interfaces/IPost';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';

// import {Newsfeed} from '../../lib/newsfeeds';
import multer from 'multer';

const router = Router();
const path = '/chat';

const storage = multer.memoryStorage();
const upload = multer({ storage });
const auth = validation.validateToken;

/*********************************************************
 *              Get Pending Messages
 *********************************************************/
export const getPending = '/pending';

router.get(getPending, auth, async (req, res) => {
    try{

    } catch (err) {
        Utility.ErrResponse(res, err);
    }
})
