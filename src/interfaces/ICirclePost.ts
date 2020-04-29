import { IPost } from './IPost';
import { Document } from 'mongoose';

export interface ICirclePost extends IPost {
	circle: string;
}

export interface ICirclePostModel extends ICirclePost, Document {

}