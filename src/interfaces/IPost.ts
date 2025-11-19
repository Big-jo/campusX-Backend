import { Document } from 'mongoose';

export interface IPostModel extends Document, IPost {
    createdAt: number;
}

export enum CommentTypes {
    REPLY = 'reply',
    POST_COMMENT = 'postComment',
    CIRCLE_COMMENT = 'circleComment',
    CIRCLE_COMMENT_REPLY = 'circleCommentReply',
    HF = 'hf',
}

export interface IPost {
    postID?: string;
    author?: string;
    text?: string;
    video?: any;
    image?: any;
    campus: string;
    likes?: number;
    dislikes?: number;
    comments?: number;
    createdAt?: number;
    // Type discriminator for unified post model
    type?: 'post' | 'comment' | 'circlePost';
    // If comment, contains parent post/comment ID
    parentPost?: string;
    // If circle post, contains circle ID
    circleID?: string;
    hashTags?: string[];
    mentions?: string[];
}

export interface ICommentModel extends IPostModel {
    parentPost: string;
    commentID: string;
    type: string;
}


export interface IComment extends IPost {
    type?: CommentTypes;
    // type: string;
    parentPost: string;
    // parentPostID: string;
    hashTags?: string[]
    // Depending on if comment belongs to a circle or not
    circleID? : string;
    memberID?: string;

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
