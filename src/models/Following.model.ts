import mongoose, { Schema, Document, mongo } from 'mongoose';
// Used to query for everyone that follows the user
export interface IFollowing extends Document {
  follower: string;
  target: string;
}

const FollowingSchema: Schema = new Schema({
  // Follower: Person following target follower
  follower: { type: Schema.Types.ObjectId, ref: 'User' },

  // Target : Person being followed
  target: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: {type: String, default: new Date()}
});

export default mongoose.model<IFollowing>('Followings', FollowingSchema);
