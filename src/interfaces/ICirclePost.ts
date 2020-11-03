import {IComment, IPost} from './IPost';
import { Document } from 'mongoose';

export interface ICirclePost extends IPost {
  circle: string;
  memberID: string;
}

export interface ICirclePostModel extends ICirclePost, Document {

}

export interface ICircleComment extends IComment {
  parentPost: string;
  circle: string;
  memberID: string;
}
