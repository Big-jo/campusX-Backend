import mongoose, {Schema} from 'mongoose';
import {ICommentModel} from 'src/interfaces/IPost';

const commentSchema: Schema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    parentPost: {type: Schema.Types.ObjectId, ref: 'Post'},
    parentPostID: {type: String},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    createdAt: {type: Number},
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    
});

commentSchema.index('parentPost');

export default mongoose.model<ICommentModel>('CircleComments', commentSchema);
