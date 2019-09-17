import mongoose, {Schema, Document, mongo} from 'mongoose';
import { IPost } from 'src/interfaces/IPost';

const PostSchema: Schema = new Schema({
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    post: {type: String},
    likes: {type: Number},
    likedBy: [{type: Schema.Types.ObjectId}],
    createdAt: {type: String},
});

// TODO: Implement tags
export default mongoose.model<IPost>('Post', PostSchema);
