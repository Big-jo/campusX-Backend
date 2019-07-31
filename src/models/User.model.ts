import mongoose, {Schema, Document} from 'mongoose';
import { IUser } from 'src/interfaces/IUser';

const UserProfileSchema: Schema = new Schema({
    avatar: {type: String},
    level: {type: Number},
    university: {type: String},
    department: {type: String},
    gender: {type: String, required: true},
    rep_points: {type: Number, default: 0},
});

const UserSchema: Schema = new Schema({
    name: {type: String, required: true},
    userTage: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    phoneNumber: {type: Number},
    userProfile: UserProfileSchema,
});

// Export the model and return IUser interface
export default mongoose.model<IUser>('User', UserSchema);
