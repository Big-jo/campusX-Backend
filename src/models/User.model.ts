import mongoose, {Schema, Document} from 'mongoose';
import { IUser } from 'src/interfaces/IUser';

const UserProfileSchema: Schema = new Schema({
    avatar: {type: String},
    level: {type: Number},
    university: {type: String},
    gender: {type: String, required: true},
    rep_points: {type: Number, default: 0},
    bio: {type: String},
    course: {type: String},
});

const UserSchema: Schema = new Schema({
    name: {type: String, required: true},
    userTag: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    phoneNumber: {type: Number},
    visits: {type: Number, default: 0},
    userProfile: UserProfileSchema,
    // People following this user
    followers: [{type: Schema.Types.ObjectId, ref: 'Follows'}],
    // People this user follows
    followings: [{type: Schema.Types.ObjectId, ref: 'Following'}],
});

// Check if this user is followed by another user

// FIXME: Fix this
UserSchema.methods.checkFollowed = function(id: string) {
    if (this.followers.includes(id)) {
        return true;
    } else {return false; }
};

UserSchema.methods.checkFollowing = function(id: string) {
    if (this.followings.includes(id)) {
        return true;
    } else {
        return false;
    }
};
// Export the model and return IUser interface
export default mongoose.model<IUser>('User', UserSchema);
