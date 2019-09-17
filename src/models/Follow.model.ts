import mongoose, {Schema, Document, mongo} from 'mongoose';

interface IFollows extends Document {
    target: string;
    follower: string;
}

const FollowsSchema: Schema = new Schema({
    // Target: Person being followed
  target: {type: Schema.Types.ObjectId, ref: 'User'},
    // Follower: Person following target follower
  follower: {type: Schema.Types.ObjectId, ref: 'User'},

});

export default mongoose.model<IFollows>('Follows', FollowsSchema);