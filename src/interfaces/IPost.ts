import {Document} from 'mongoose';

export interface IPost extends Document {
    author: string;
    post: string;
    tag?: string;
    createdAt: string;
    likes: number;
}
