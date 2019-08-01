import mongoose, {Schema, Document, mongo} from 'mongoose';

interface IFollower extends Document {
    name: string;
    avatar: string;
}

const FollowerSchema: Schema = new Schema({
    // Target: Person being followed
  target: {type: Schema.Types.ObjectId, ref: 'User'},
    // Follower: Person following target follower
  follower: {type: Schema.Types.ObjectId, ref: 'User'},

});

export default mongoose.model<IFollower>('Follower', FollowerSchema);