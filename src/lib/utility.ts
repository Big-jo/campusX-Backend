import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status-codes';

export class Utility {

    constructor() {}

    public static createToken(payload: any) {
        const secret = process.env.JWT_SECRET as string;
        return jwt.sign(payload, secret);
    }

    public static ErrResponse(res: Response) {
        const errMsg = { error: 'Oops, an error occurred' };

        res.status(INTERNAL_SERVER_ERROR).json(errMsg);
    }
    
    
}
