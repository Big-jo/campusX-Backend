import {Router} from 'express';
import {CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST} from 'http-status-codes';
import {Utility} from '../../lib/utility';
import {Search} from '../../entities/Search/Search';

const router = Router();
const path = '/search';

/******************************************************************************
 *                                 SEARCH FOR POSTS
 /******************************************************************************/
export const searchPost = '/posts?term';
router.get(searchPost, async (req, res) => {
    try {
        const search = new Search(req.query.term);
        const result = await search.PostSearch();

        res.status(OK).json({result});
    } catch (e) {
        Utility.ErrResponse(e, res);
    }
});

/******************************************************************************
 *                                 SEARCH FOR CIRCLES
 /******************************************************************************/
const searchCircles = '/circles?term';
router.get(searchCircles, async (req, res) => {
    try {
        const search = new Search(req.query.term);
        const result = await search.CircleSearch();

        res.status(OK).json({result});
    } catch (e) {
        Utility.ErrResponse(e, res);
    }
});

/******************************************************************************
 *                                 SEARCH FOR CIRCLE POSTS
 /******************************************************************************/
const searchCirclePosts = '/circles/post?term';
router.get(searchCirclePosts, async (req, res) => {
    try {
        const search = new Search(req.query.term);
        const result = await search.CirclePostSearch();
        res.status(OK).json({result});
    } catch (e) {
        Utility.ErrResponse(e, res);
    }
});

/******************************************************************************
 *                                 SEARCH FOR USERS
 /******************************************************************************/
const searchUser = '/user?term&criteria';
router.get(searchUser, async (req, res) => {
    try {
        const search = new Search(req.query.term);
        const result = await search.UserSearch(req.query.criteria);

        res.status(OK).json({result});
    } catch (e) {
        Utility.ErrResponse(e, res);
    }
});
export default {router, path};
