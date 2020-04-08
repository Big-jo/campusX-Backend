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
    fcm_token: {type: String},
});

// Check if this user is followed by the user making the request

UserSchema.methods.checkIsFollowed = function(id: string) {
    if (check(this.followers, id, 'follower')) {
        return true;
    } else {
        return false;
     }
};

// Check if this user is following the user making the request
UserSchema.methods.checkIsFollowing = function(id: string) {
    if (check(this.followings, id, 'target')) {
        return true;
    } else {
        return false;
    }
};

// Check object in an array if a particular value is present
function check(array: [], value: string, field: string) {
    for (const obj of array) {
        let value1 = obj[field] as string;
        value1 = value1.toString();

        if (value1 === value) {
            return true;
        } else {
            return false;
        }
    }
}
// Export the model and return IUser interface
export default mongoose.model<IUser>('User', UserSchema);
