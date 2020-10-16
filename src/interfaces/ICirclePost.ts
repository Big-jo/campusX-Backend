import { IPost } from './IPost';
import { Document } from 'mongoose';

export interface ICirclePost extends IPost {
  circleID: string;
  memberID: string;
}

export interface ICirclePostModel extends ICirclePost, Document {

}

export interface ICircleComment extends IPost {
  parentPost: string;
  circleID: string;
  memberID: string;
}