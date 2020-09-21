
import mongoose, { Schema, Document, mongo } from 'mongoose';
import { IPostModel } from 'src/interfaces/IPost';
import { ICirclePostModel } from 'src/interfaces/ICirclePost';
import mongoosePaginate from 'mongoose-paginate';

const CirclePostSchema: Schema = new Schema({
    author: { type: String, ref: 'User' },
    circle: { type: String, ref: 'Circle' },
    userTag: { type: String },
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    createdAt: { type: String, default: Date },
});

CirclePostSchema.plugin(mongoosePaginate);

export default mongoose.model<ICirclePostModel>('CirclePost', CirclePostSchema);
