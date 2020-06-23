import { Router, Response, Request } from 'express';
import { CREATED, OK, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { Store } from '../../entities/Store/Store';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import { Item } from '../../entities/Store/Item';

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
            res.status(CREATED).json({token: result.token});
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
        const result = await Store.Login(req.body.name, req.body.password);
        if (result!.token !== undefined) {
            res.status(OK).json({token: result!.token});
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

export const cataloguePath = '/catalogue/:storeID';
router.get(cataloguePath, async (req: Request, res: Response) => {
    try {
        const result = await Store.Catalogue(req.params.storeID);
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
        if (result === 0) { res.status(CREATED).send(); }
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                           Add Item To Store
/******************************************************************************/
export const addItems = '/addItem';
router.post(addItems, async (req: Request, res: Response) => {
    try {
        console.log(req.body)
        switch (req.body.options.multiDoc) {
            case true:
                const result = await Item.AddItems({multiDoc: true}, req.body.itemObject, req.body.items);
                result === 0 ? res.status(CREATED).send() : res.status(BAD_REQUEST).send();
                break;
            
            case false:
                const result2 = await Item.AddItems({multiDoc: false}, req.body.itemsObject);
                result2 === 0 ? res.status(CREATED).send() : res.status(BAD_REQUEST).send();
                break;
            default:
                break;
        }
    } catch (error) {
        logger.error(error.message);
        Utility.ErrResponse(res);
    }
})

/******************************************************************************
*                                 Update Item Property
/******************************************************************************/
export const updateItem = '/item/update';
router.post(updateItem, async (req: Request, res: Response) => {
    try {
        const result = await Item.UpdateItemProperty(req.body.itemID, req.body.field, req.body.value);
        result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).send();
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                                 Get Item
/******************************************************************************/

export const getItem = '/item/:itemID';
router.get(getItem, async (req: Request, res: Response) => {
    try {
        const result = await Item.GetItem(req.params.itemID);
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
 *                                 Get Stores
 /******************************************************************************/

export const getStores = '/all';
router.get(getStores, async (req: Request, res: Response) => {
    try {
        const result = await Store.GetStores();
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res);
    }
});


// TODO: Purchase API

export default { router, path };
