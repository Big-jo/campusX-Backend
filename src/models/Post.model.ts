import mongoose, {Schema, Document} from 'mongoose';

const PostSchema: Schema = new Schema({
    author: {type: Schema.Types.ObjectId},
    post: {type: String},
    likes: {type: Number},
    likedBy: [{type: Schema.Types.ObjectId}],
    createdAt: {type: String},
});
// TODO: Implement tags
