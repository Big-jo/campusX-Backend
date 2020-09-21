import mongoose, {Schema, Document, mongo} from 'mongoose';

// Used to query for everyone user is following \
export interface IFollower extends Document {
    target: string;
    follower: string;
}

const FollowerSchema: Schema = new Schema({
    // Target: Person being followed
  target: {type: Schema.Types.ObjectId, ref: 'User'},
    // Follower: Person following target follower
  follower: {type: Schema.Types.ObjectId, ref: 'User'},

});

export default mongoose.model<IFollower>('Follower', FollowerSchema);
