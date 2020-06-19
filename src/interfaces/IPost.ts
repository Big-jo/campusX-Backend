import {Document} from 'mongoose';

export interface IPostModel extends Document {
    name: string,
    author: string;
    text: string;
    userTag: string;
    video: string;
    image: string;
    tag?: string;
    createdAt: string;
    likes: number;
    dislikes: number;
    trash: number;
    campus: string;
    scorePost(): number;
    checkLiked(id: string): boolean;
    parentPost: string;
}

export interface IPost {
    name?: string;
    author?: string;
    text?: string;
    userTag: string;
    video?: string;
    image?: string;
    campus: string;
    parentPost?: string;
}

export interface ICommentModel extends IPostModel{
    parentPost: string;
}

export interface IComment extends IPost{
    parentPost: string;
}

export interface IRepostModel extends IPostModel {
    parentPost: string;
}

export interface IRepost extends IPost {
    parentPost: string;
}
// export interface IPostCached {
//     [newsfeedID: string]: IPost;
// } 
