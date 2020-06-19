import { Merchant } from './../../entities/Merchant/Merchant';
import { Router, Response, Request } from 'express';
import { CREATED, INTERNAL_SERVER_ERROR, OK, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { Utility } from '../../lib/utility';


const router = Router();
const path = '/merchant';

const auth = validation.validateToken;

/******************************************************************************
*                                 New Merchant
/******************************************************************************/

export const newMerchant = '/create';
router.post(newMerchant, async (req: Request, res: Response) => {
    try {
        const result = await Merchant.Create(req.body.merchantObject);
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res);
    }
});

/******************************************************************************
*                        GET STORES THAT BELONG TO MERCHANT
/******************************************************************************/

export const getStores = '/stores';
router.get(getStores, async (req: Request, res: Response) => {
    try {
        const result = await Merchant.GetStores(req.body.merchantID);
        res.status(OK).json({result});
    } catch (error) {
        Utility.ErrResponse(res);
    }
});