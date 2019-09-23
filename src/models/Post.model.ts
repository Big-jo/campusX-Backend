import mongoose, {Schema, Document, mongo} from 'mongoose';
import { IPost } from 'src/interfaces/IPost';

const PostSchema: Schema = new Schema({
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    post: {type: String},
    likes: {type: Number, default: 0},
    dislikes: {type: Number, default: 0},
    trash: {type: Number, default: 0},
    likedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    createdAt: {type: String},
});

PostSchema.methods.scorePost = function() {
    // if ((this.dislikes + this. trash) === 0) {
    //     return this.likes;
    // } else {
    //     const PIS = (this.likes) / (this.dislikes + this. trash);
    //     return (Math.round(PIS * 100) / 100);
    // }
    return this.likes;
};

// TODO: Implement tags
export default mongoose.model<IPost>('Post', PostSchema);
