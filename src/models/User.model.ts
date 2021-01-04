import mongoose, {Schema} from 'mongoose';
import {IUser} from 'src/interfaces/IUser';
import mongoosePaginate from 'mongoose-paginate';

const UserSchema: Schema = new Schema({
    name: {type: String, required: true},
    userTag: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    userProfile: {
        avatar: {type: String},
        level: {type: Number},
        university: {type: String},
        gender: {type: String},
        rep_points: {type: Number, default: 0},
        bio: {type: String},
        course: {type: String},
        phoneNumber: {type: Number},
        visits: {type: Number, default: 0},
        lastSeen: {type: Date},
        followers: {type: Number, default: 0},
        followings: {type: Number, default: 0},
        post_count: {type: Number, default: 0},
    },
    fcm_token: {type: String},
    // lastActive: {type: Date},  Implement last active
});
UserSchema.plugin(mongoosePaginate);
UserSchema.index({'name': 'text', 'userTag': 'text', 'userProfile.university': 1});
// Export the model and return IUser interface
export default mongoose.model<IUser>('User', UserSchema);
