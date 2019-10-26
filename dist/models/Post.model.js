"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const PostSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    video: { type: String, default: null },
    image: { type: String, default: null },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    trash: { type: Number, default: 0 },
    likedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: String },
});
PostSchema.methods.scorePost = function () {
    return this.likes;
};
exports.default = mongoose_1.default.model('Post', PostSchema);
