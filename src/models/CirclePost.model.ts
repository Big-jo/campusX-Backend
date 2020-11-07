
import mongoose, { Schema, Document, mongo } from 'mongoose';
import { IPostModel } from 'src/interfaces/IPost';
import { ICirclePostModel } from 'src/interfaces/ICirclePost';
// import mongoosePaginate from 'mongoose-paginate';
// tslint:disable-next-line:no-var-requires
const aggregatePlugin = require('mongoose-aggregate-paginate-v2');

const CirclePostSchema: Schema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    circleID: {type: Schema.Types.ObjectId, ref: 'Circle'},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: {type: Number, default: 0},
    trash: { type: Number, default: 0 },
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    createdAt: { type: String, default: Date },
});

CirclePostSchema.plugin(aggregatePlugin);

CirclePostSchema.index({ text: 'text' });
export default mongoose.model<ICirclePostModel>('CirclePost', CirclePostSchema);
