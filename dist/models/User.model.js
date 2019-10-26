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
UserSchema.methods.checkFollowed = function (id) {
    if (this.followers.includes(id)) {
        return true;
    }
    else {
        return false;
    }
};
UserSchema.methods.checkFollowing = function (id) {
    if (this.followings.includes(id)) {
        return true;
    }
    else {
        return false;
    }
};
exports.default = mongoose_1.default.model('User', UserSchema);
