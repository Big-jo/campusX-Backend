import mongoose, { Schema } from 'mongoose';
import { ICircleMemberModel } from 'src/interfaces/ICircleMembers';

const CircleMemberSchema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'User'}, // Or memeberID
    circle: {type: Schema.Types.ObjectId, ref: 'Circle'},  // Or CircleID
    createdAt: {type: String, default: new Date()}
});

export default mongoose.model<ICircleMemberModel>('CircleMember', CircleMemberSchema);
