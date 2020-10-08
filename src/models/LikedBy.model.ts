import mongoose, {Schema} from 'mongoose';

const likedBySchema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'user'},
    postID: {type: Schema.Types.ObjectId, ref: 'post'},
});

export default mongoose.model('likedBy', likedBySchema);
