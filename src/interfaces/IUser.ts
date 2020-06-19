import {Document} from 'mongoose';

export interface IUserProfile {
    avatar?: string; // If Male, set avatar to a male placeholder image
    university: string;
    department: string;
    gender: string;
    rep_points?: string;
    bio: string;
    // TODO: Test lastseen feature 
    lastSeen: Date;
}

export interface IUserModel extends Document {
    name: string;
    userID: string;
    userTag: string;
    email: string;
    password: string;
    userProfile: IUserProfile;
    phone_number: string;
    followings: string[];
    followers: string[];
    checkIsFollowed(id: string): boolean;
    checkIsFollowing(id: string): boolean;
    fcm_token: string;
}

export interface IUser  {
    name: string;
    userID?: string;
    userTag: string;
    email: string;
    password: string;
    userProfile?: IUserProfile;
    phone_number: string;
}

