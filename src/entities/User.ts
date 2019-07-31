import { IUser, IUserProfile } from 'src/interfaces/IUser';
import jwt from 'jsonwebtoken';

export class User {
    public name: string;
    public email: string;
    public password: string;
    public userProfile: IUserProfile;

    constructor(name: string,
                email: string,
                password: string,
                userProfile: IUserProfile) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.userProfile = userProfile;
    }
}
