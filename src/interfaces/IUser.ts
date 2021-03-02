import { Document, PaginateModel } from "mongoose";

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

// export interface IUserModel extends Document{
//     sameCampus: boolean;
//     name: string;
//     userID: string;
//     userTag: string;
//     email: string;
//     password: string;
//     userProfile: IUserProfile;
//     phone_number: string;
//     followings: string[];
//     followers: string[];
//     checkIsFollowed: boolean;
//     checkIsFollowing: boolean;
//     fcm_token: string;
// }

export interface IUser extends Document {
  name: string;
  userID?: string;
  userTag: string;
  email: string;
  password: string;
  userProfile: IUserProfile;
  phone_number: string;
  fcm_token: string;
  otp?: string;
}

export interface IUserModel<T extends Document> extends PaginateModel<T> {}
