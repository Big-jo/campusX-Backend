import mongoose, {Schema} from 'mongoose';
import { IPostModel } from 'src/interfaces/IPost';

const PostSchema: Schema = new Schema({
    authorAvatar: { type: String},
    author: { type: String, ref: 'User' },
    postID: {type: String},
    userTag: { type: String},
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    createdAt: {type: Number},
    campus: { type: String},
    // If this is a comment, this would be populated
    parentPost: {type: String},
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
});
export default mongoose.model<IPostModel>('Post', PostSchema);
