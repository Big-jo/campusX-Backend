import { IUserProfile } from '../../src/interfaces/IUser';

declare global{
    namespace Express {
         interface Request {
             token: {
                 userID: string,
                 userProfile: IUserProfile,
             }
         }
     }
     
}