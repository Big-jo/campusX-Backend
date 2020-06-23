import jwt from 'jsonwebtoken';
import { IAuth } from '../interfaces/IAuth';
import { NextFunction, Response, Request } from 'express';
import { OK, UNAUTHORIZED } from 'http-status-codes';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import { logger } from '@shared';
import {Utility} from '../lib/utility';

const validation = {
    validateToken: (req: any, res: Response, next: NextFunction) => {
        const authorizationHeader = req.headers.authorization;
        let result: object | string;

        if (authorizationHeader) {
            const token = authorizationHeader.split(' ')[1];
            try {
                // Verify the token
                const secret = process.env.JWT_SECRET as string;
                result = jwt.verify(token, secret);
                req.token = result as {
                    userID: string,
                };

                next();
            } catch (error) {
                // Throw an error if anything goes wrong with verification
                Utility.ErrResponse(res, error);
            }
        } else {
            res.status(UNAUTHORIZED).json({
                error: 'Sorry you\'re not authorized to use this endpooint',
            });
        }
    },
};

export default validation;
