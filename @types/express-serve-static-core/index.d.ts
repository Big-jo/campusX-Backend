import { IUserProfile } from '../../src/interfaces/IUser';

declare global {
    namespace Express {
        interface Request {
            token: {
                userID: string;
                userTag: string;
                campus: string;
                name: string;
                avatar: string;
            };
        }
    }

}
