"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Post_model_1 = tslib_1.__importDefault(require("../models/Post.model"));
const Following_model_1 = tslib_1.__importDefault(require("../models/Following.model"));
const User_model_1 = tslib_1.__importDefault(require("../models/User.model"));
const array_sort_1 = tslib_1.__importDefault(require("array-sort"));
function GetPosts(req, res, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (options.sortOptions.mostRecent === true) {
            switch (req.params.key) {
                case '0':
                    try {
                        const posts = yield Post_model_1.default.find({ author: req.params.id })
                            .populate({ path: 'author', select: { name: 1, userProfile: 1, userTag: 1 } })
                            .exec();
                        return posts.reverse();
                    }
                    catch (error) {
                        return error;
                    }
                case '1':
                    try {
                        const followings = yield Following_model_1.default.find({ follower: req.params.id }, { target: 1 }).lean().exec();
                        const targetObjectIDs = [];
                        for (const following of followings) {
                            targetObjectIDs.push(following.target);
                        }
                        let posts = yield Post_model_1.default.find({ author: { $in: targetObjectIDs } })
                            .populate({ path: 'author', select: { name: 1, userProfile: 1, userTag: 1 } })
                            .exec();
                        posts = yield array_sort_1.default(posts, (a, b) => {
                            return Date.parse(a.createdAt) - Date.parse(b.createdAt);
                        }, { reverse: true });
                        return posts;
                    }
                    catch (error) {
                        return error;
                    }
                default:
                    return new Error('Sorry, unrecognizable key');
            }
        }
    });
}
exports.GetPosts = GetPosts;
function GetCampusPosts(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const users = yield User_model_1.default.find({ 'userProfile.university': req.params.campusID });
            let posts = [];
            for (const user of users) {
                const Posts = yield Post_model_1.default.find({ author: user._id })
                    .populate({ path: 'author', select: { name: 1, userProfile: 1 } }).exec();
                for (const post of Posts) {
                    const scoredPost = { post, PIS: post.scorePost() };
                    posts.push(scoredPost);
                }
            }
            posts = array_sort_1.default(posts, 'PIS', { reverse: true });
            return posts;
        }
        catch (error) {
            return error;
        }
    });
}
exports.GetCampusPosts = GetCampusPosts;
function LikePost(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            Post_model_1.default.findByIdAndUpdate(req.body.postID, { $inc: { likes: 1 }, likedBy: req.params.userID }).exec();
            User_model_1.default.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.25 } }).exec();
        }
        catch (error) {
            return error;
        }
    });
}
exports.LikePost = LikePost;
function DislikePost(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            Post_model_1.default.findByIdAndUpdate(req.body.postID, { $inc: { dislikes: 1 } }).exec();
            User_model_1.default.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.13 } }).exec();
        }
        catch (error) {
            return error;
        }
    });
}
exports.DislikePost = DislikePost;
function TrashPost(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            Post_model_1.default.findByIdAndUpdate(req.body.postID, { $inc: { trash: 1 } }).exec();
            User_model_1.default.findByIdAndUpdate(req.body.authorID, { $inc: { 'userProfile.rep_points': 0.9 } }).exec();
        }
        catch (error) {
            return error;
        }
    });
}
exports.TrashPost = TrashPost;
