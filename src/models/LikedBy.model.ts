import mongoose, {Schema} from 'mongoose';

interface ILikedBy {
    userID: string;
    postID: string;
}

const likedBySchema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'user'},
    postID: {type: Schema.Types.ObjectId, ref: 'post'},
});

export default mongoose.model<ILikedBy>('likedBy', likedBySchema);
