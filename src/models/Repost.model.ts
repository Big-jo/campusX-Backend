
import mongoose, { Schema, Document, mongo } from 'mongoose';
import { IPostModel, IRepost, IRepostModel } from 'src/interfaces/IPost';

const RepostSchema: Schema = new Schema({
    author: { type: String, ref: 'User' },
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    createdAt: { type: String },

});

export default mongoose.model<IRepostModel>('Repost', RepostSchema);
