import mongoose, {Schema} from 'mongoose';
import {IUser} from 'src/interfaces/IUser';
import mongoosePaginate from 'mongoose-paginate';

const UserSchema: Schema = new Schema({
    name: {type: String, required: true},
    userTag: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    resetToken: {type: String, required: true},
    userProfile: {
        avatar: {type: String, default: null},
        level: {type: Number, default: null},
        university: {type: String, default: null},
        gender: {type: String, default: null},
        rep_points: {type: Number, default: 0},
        bio: {type: String, default: null},
        course: {type: String, default: null},
        phoneNumber: {type: Number, default: null},
        visits: {type: Number, default: 0},
        lastSeen: {type: Date, default: null},
        followers: {type: Number, default: 0},
        followings: {type: Number, default: 0},
        post_count: {type: Number, default: 0},
        profileComplete: {type: Boolean, default: false},
        interests: {type: [String], default: []},
    },
    profileComplete: {type: Boolean, default: false},
    fcm_token: {type: String, default: null},
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            delete ret.password;
            delete ret.resetToken;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});
UserSchema.plugin(mongoosePaginate);
UserSchema.index({'name': 'text', 'userTag': 'text', 'userProfile.university': 1});
// Export the model and return IUser interface
export default mongoose.model<IUser>('User', UserSchema);
