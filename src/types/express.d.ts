import { IUser } from '../interfaces/IUser';

declare global {
  namespace Express {
    interface Request {
      token?: {
        userID: string;
      };
      user?: IUser;
    }
  }
}

export {};
