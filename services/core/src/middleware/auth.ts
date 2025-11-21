import jwt from 'jsonwebtoken';
import { IAuth } from '../interfaces/IAuth';
import { NextFunction, Response, Request } from 'express';
import { OK, UNAUTHORIZED } from 'http-status-codes';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import { logger } from '@shared';
import { Utility } from '../lib/utility';
import UserModel from '../models/User.model';

const validation = {
  validateToken: async (req: any, res: Response, next: NextFunction) => {
    const authorizationHeader = req.headers.authorization;

    if (authorizationHeader) {
      const token = authorizationHeader.split(' ')[1];
      try {
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token, secret) as { userID: string };

        const user = await UserModel.findById(decoded.userID)
          .select('-password -resetToken')
          .lean();

        if (!user) {
          return res.status(UNAUTHORIZED).json({
            error: 'User not found',
          });
        }

        req.token = decoded;
        req.user = user as IUser;

        next();
      } catch (error) {
        Utility.ErrResponse(res, error);
      }
    } else {
      res.status(UNAUTHORIZED).json({
        error: 'Sorry you\'re not authorized to use this endpoint',
      });
    }
  },
};

// Named export for v2 API
export const auth = validation.validateToken;

export default validation;
