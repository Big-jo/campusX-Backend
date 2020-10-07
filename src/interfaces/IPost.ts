import { Document } from 'mongoose';

export interface IPostModel extends Document, IPost {
    createdAt: Date;
}

export interface IPost {
    authorAvatar: string;
    postID?: string;
    name?: string;
    author?: string;
    text?: string;
    userTag: string;
    video?: any;
    image?: any;
    campus: string;
    likes?: number;
    dislikes?: number;
    comments?: number;
    createdAt?: Date;
}

export interface ICommentModel extends IPostModel {
    parentPost: string;
}

export interface IComment extends IPost {
    commentID: string;
    parentPost: string;
    parentPostID: string;
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
