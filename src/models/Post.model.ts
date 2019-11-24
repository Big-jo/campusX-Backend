// tslint:disable-next-line: jsdoc-format

import mongoose, { Schema, Document, mongo } from 'mongoose';
import { IPost } from 'src/interfaces/IPost';

const commentSchema: Schema = new Schema<any>({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    createdAt: { type: String },
});

const PostSchema: Schema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: String },
    comments: [commentSchema],
});

PostSchema.methods.scorePost = function() {
    // if ((this.dislikes + this. trash) === 0) {
    //     return this.likes;
    // } else {
    //     const PIS = (this.likes) / (this.dislikes + this. trash);
    //     return (Math.round(PIS * 100) / 100);
    // }
    return this.likes;
};

/**
 *  Check if a the requesting user has liked the post
*/
PostSchema.methods.checkLiked = function(id: string) {
    const ID = id.toString();
    for (const like of this.likedBy) {
       return like === ID;
    }
};

// /**
//  *  Check if a the requesting user has disliked the post
// */
// PostSchema.methods.disLiked = function(id: string) {

// };

// /**
//  *  Check if a the requesting user has disliked the post
// */
// PostSchema.methods.trash = function(id: string) {

// };

// TODO: Implement tags
export default mongoose.model<IPost>('Post', PostSchema);
