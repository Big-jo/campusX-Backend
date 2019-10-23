import {Document} from 'mongoose';

export interface IPost extends Document {
    author: string;
    text: string;
    video: string;
    image: string;
    tag?: string;
    createdAt: string;
    likes: number;
    dislikes: number;
    trash: number;
    scorePost(): number;
}
