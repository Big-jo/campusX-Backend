import { Document } from 'mongoose';

export interface ICircleMember {
    userID: string;
    circle: string;
}

export interface ICircleMemberModel extends ICircleMember, Document{

}