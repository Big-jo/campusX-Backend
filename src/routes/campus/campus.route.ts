import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { Request, Response, Router, response } from 'express';
import IORedis from 'ioredis';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import validation from '../../middleware/auth';
import { Campus } from '../../entities/Campus';

// /******************************************************************************
// *                                 Router Setup
// /******************************************************************************/

const router = Router();
const path = '/campus';
const auth = validation.validateToken;
let client: IORedis.Redis;

export const getCampuses = '/list';
router.get(getCampuses, async (req: Request, res: Response) => {
    try {
        const result = await Campus.GetList(res.locals.primaryCache);
        res.status(OK).json({ campuses: result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

export const getPost = '/posts/:campus';
router.get(getPost, auth, async (req: Request, res: Response) => {
    try {
        const campus = req.params.campus === 'mine' ? req.token.campus : req.params.campus;
        const result = await Campus.GetPosts(res.locals.primaryCache, campus, req.token.userID);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                              GET USER'S CAMPUS TRENDS
/******************************************************************************/

export const campusTrend = '/trends/my';
router.get(campusTrend, async (req: Request, res: Response) => {
    // try {
    //     console.log(req.query)
    //     const result = await Campus.GetCampusTrend(client, req.query.campus);
    //     res.status(OK).json({ result });
    // } catch (error) {
    //     Utility.ErrResponse(res, error);
    // }
});

/******************************************************************************
*                            GET ALL CAMPUSES AND THEIR TRENDS
/******************************************************************************/
export const allCampusTrends = '/trends/campuses/all';
router.get(allCampusTrends, async (req: Request, res: Response) => {
    // try {
    //     const result = await Campus.GetCampusesAndTrends(client);
    //     res.status(OK).json({ result });
    // } catch (error) {
    //     Utility.ErrResponse(res, error);
    // }
});
export default { router, path };
