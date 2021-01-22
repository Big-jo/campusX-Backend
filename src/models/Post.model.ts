import mongoose, {Schema} from 'mongoose';
import { IPostModel } from 'src/interfaces/IPost';
import mongoosePaginate from 'mongoose-paginate';
const aggregatePlugin = require('mongoose-aggregate-paginate-v2');

const PostSchema: Schema = new Schema({
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    postID: {type: String},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: {type: Number, default: 0},
    trash: { type: Number, default: 0 },
    createdAt: {type: Number},
    campus: {type: String, required: true},
    // If this is a comment, this would be populated
    parentPost: {type: String},
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
});

// PostSchema.plugin(mongoosePaginate);
PostSchema.plugin(aggregatePlugin);

PostSchema.index({text: 'text'});

export default mongoose.model<IPostModel>('Post', PostSchema);
