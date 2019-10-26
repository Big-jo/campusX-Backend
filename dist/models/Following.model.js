"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const FollowingSchema = new mongoose_1.Schema({
    follower: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    target: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
});
exports.default = mongoose_1.default.model('Following', FollowingSchema);
