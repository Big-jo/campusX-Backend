import {Document} from 'mongoose';

export interface IPostModel extends Document {
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
    checkLiked(id: string): boolean;
}

export interface IPost {
    author?: string;
    text?: string;
    video?: string;
    image?: string;
    tag?: string;
    createdAt?: string;
    likes?: number;
    dislikes?: number;
    trash?: number;
    // scorePost()?: number;
    // checkLiked(id: string): boolean;
}

export interface IComment extends IPostModel{
    parentPost: string;
}

export interface IRepost extends IPostModel {
    parentPost: string;
}