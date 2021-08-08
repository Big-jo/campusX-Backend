import mongoose, {Schema} from 'mongoose';
// @ts-ignore
// tslint:disable-next-line:no-var-requires
const aggregatePlugin = require('mongoose-aggregate-paginate-v2');
// import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

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
    comments: { type: Number, default: 0 },
    type: { type: String, }
}, {
    timestamps: true
});

commentSchema.plugin(aggregatePlugin);

commentSchema.index('parentPost');

export default mongoose.model<ICommentModel>('Comment', commentSchema);
