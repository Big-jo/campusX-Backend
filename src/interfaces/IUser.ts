import {Document} from 'mongoose';

export interface IUserProfile{
    avatar?: string; // If Male, set avatar to a male placeholder image
    level: number;
    university: string;
    department: string;
    gender: string;
    rep_points?: string;
}

export interface IUser extends Document {
    name: string;
    userTag: string,
    email: string;
    password: string;
    user_profile: IUserProfile;
    phone_number: number;
}
