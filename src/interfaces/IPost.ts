import { Document } from 'mongoose';

export interface IPostModel extends Document, IPost {
    createdAt: number;
}

export interface IPost {
    postID?: string;
    name?: string;
    author?: string;
    text?: string;
    video?: any;
    image?: any;
    campus: string;
    likes?: number;
    dislikes?: number;
    comments?: number;
    createdAt?: number;
    parentPost: string;
}

export interface ICommentModel extends IPostModel {
    parentPost: string;
    commentID: string;
}

export interface IComment extends IPost {
    parentPost: string;
    // parentPostID: string;
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
