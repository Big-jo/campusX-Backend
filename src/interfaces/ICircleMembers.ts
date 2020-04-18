import { Document } from 'mongoose';

export interface ICircleMember {
    userID: string;
}

export interface ICircleMemberModel extends ICircleMember, Document{

}