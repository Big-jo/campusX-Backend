
import mongoose, { Schema, Document, mongo } from 'mongoose';
import { IPostModel } from 'src/interfaces/IPost';

const PostSchema: Schema = new Schema({
    author: { type: String, ref: 'User' },
    userTag: { type: String},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    createdAt: { type: String },
});

PostSchema.methods.score = function score() {
    
}

export default mongoose.model<IPostModel>('Post', PostSchema);
