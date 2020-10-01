import mongoose, { Schema, Document, mongo } from 'mongoose';
import {IPostModel, IComment, ICommentModel} from 'src/interfaces/IPost';



const commentSchema: Schema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    parentPost: {type: Schema.Types.ObjectId, ref: 'Post'},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    createdAt: { type: Date, default: Date.now() },
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
});

commentSchema.index('parentPost');

export default mongoose.model<ICommentModel>('Comment', commentSchema);
