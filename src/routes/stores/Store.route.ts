import { Router, Response, Request } from 'express';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { Store } from '../../entities/Store/Store';
import { Utility } from '../../lib/utility';
import { logger } from 'src/shared/Logger';

const router = Router();
const path = '/store';
const auth = validation.validateToken;

/******************************************************************************
 *                                 Create Store
 /******************************************************************************/

export const createStorePath = '/create';
/*
 req.body.storeName, 
 req.body.storeObject
*/
router.post(createStorePath, async (req: Request, res: Response) => {
    try {
        const result = await Store.Create(req.body.storeName, req.body.storeObject);
        if (result.token) {
            res.status(CREATED).json(result.token);
        } else {
            res.status(BAD_REQUEST).json({ exist: result.exist });
        }

    } catch (error) {
        logger.error(error);
        Utility.ErrResponse (res);
    }
});

/******************************************************************************
*                                 LOGIN TO STORE
/******************************************************************************/

export const storeLogin = '/login';
/**
 * req.body.email, req.body.password
 */
router.post(storeLogin, async (req: Request, res: Response) => {
    try {
        const result = await Store.Login(req.body.email, req.body.password);
        if (result!.token !== undefined) {
            res.status(CREATED).json(result!.token);
        } else {
            res.status(BAD_REQUEST).json({ exist: result!.badRequest });
        }
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                                 GET STORE CATALOGUE
/******************************************************************************/

export const cataloguePath = '/catalogue';
router.get(cataloguePath, async (req: Request, res: Response) => {
    try {
        const result = await Store.Catalogue(req.body.storeID);
        res.status(OK).json({ catalogue: result.items });
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                                 UPDATE STORE
/******************************************************************************/

export const updateStore = '/update';
router.post(updateStore, async (req: Request, res: Response) => {
    try {
        const result = await Store.Update(req.body.storeID, req.body.updateField, req.body.updateValue);
        if (result === 0) { res.status(CREATED); }
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

// TODO: Purchase API

export default { router, path };
