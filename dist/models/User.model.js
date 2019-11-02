"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const UserProfileSchema = new mongoose_1.Schema({
    avatar: { type: String },
    level: { type: Number },
    university: { type: String },
    gender: { type: String, required: true },
    rep_points: { type: Number, default: 0 },
    bio: { type: String },
    course: { type: String },
});
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    userTag: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phoneNumber: { type: Number },
    visits: { type: Number, default: 0 },
    userProfile: UserProfileSchema,
    followers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Follows' }],
    followings: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Following' }],
});
UserSchema.methods.checkIsFollowed = function (id) {
    if (check(this.followers, id, 'follower')) {
        return true;
    }
    else {
        return false;
    }
};
UserSchema.methods.checkIsFollowing = function (id) {
    if (check(this.followings, id, 'target')) {
        return true;
    }
    else {
        return false;
    }
};
function check(array, value, field) {
    for (const obj of array) {
        let value1 = obj[field];
        value1 = value1.toString();
        if (value1 === value) {
            return true;
        }
        else {
            return false;
        }
    }
}
exports.default = mongoose_1.default.model('User', UserSchema);
