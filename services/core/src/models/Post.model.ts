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
    // Type discriminator: 'post' | 'comment' | 'circlePost'
    type: {type: String, enum: ['post', 'comment', 'circlePost'], default: 'post'},
    // If this is a comment, this would be populated
    parentPost: {type: String},
    // If this is a circle post, this would be populated
    circleID: {type: Schema.Types.ObjectId, ref: 'Circle'},
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    hashTags: [{type: String}],
    mentions:[{type: String}],
    // deleted: {type: Boolean}
});

// PostSchema.plugin(mongoosePaginate);
PostSchema.plugin(aggregatePlugin);

// Add indexes
PostSchema.index({text: 'text'});
PostSchema.index({type: 1}); // Index for filtering by type
PostSchema.index({parentPost: 1, type: 1}); // Index for finding comments
PostSchema.index({circleID: 1, type: 1}); // Index for finding circle posts

// Transform _id to id and remove __v on JSON serialization
PostSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

PostSchema.set('toObject', {
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model<IPostModel>('Post', PostSchema);
