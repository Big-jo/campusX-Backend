import mongoose, {Schema, Document} from 'mongoose';

interface ILikedBy extends Document {
    userID: string;
    postID: string;
}

const likedBySchema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'user'},
    postID: {type: Schema.Types.ObjectId, ref: 'post'},
});

export default mongoose.model<ILikedBy>('likedBy', likedBySchema);
