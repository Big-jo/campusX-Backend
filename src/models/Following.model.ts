import mongoose, {Schema, Document, mongo} from 'mongoose';

interface IFollowing extends Document {
    name: string;
    avatar: string;
}

const FollowingSchema: Schema = new Schema({
  // Follower: Person following target follower
  follower: {type: Schema.Types.ObjectId, ref: 'User'},

    // Target : Person being followed
  target: {type: Schema.Types.ObjectId, ref: 'User'},

});

export default mongoose.model<IFollowing>('Follower', FollowingSchema);
