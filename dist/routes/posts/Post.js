"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const Post_model_1 = tslib_1.__importDefault(require("../../models/Post.model"));
const moment_1 = tslib_1.__importDefault(require("moment"));
const http_status_codes_1 = require("http-status-codes");
const Logger_1 = require("../../shared/Logger");
const post_1 = require("../../controllers/post");
const auth_1 = tslib_1.__importDefault(require("../../middleware/auth"));
const router = express_1.Router();
const path = '/post';
const auth = auth_1.default.validateToken;
exports.createPostPath = '/create';
router.post(exports.createPostPath, auth, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield new Post_model_1.default({
            author: req.body.userID,
            text: req.body.text,
            video: req.body.video,
            image: req.body.image,
            createdAt: moment_1.default().format('lll'),
        });
        post.save();
        res.status(http_status_codes_1.CREATED).json({
            success: 'Posted',
        });
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
}));
exports.getPostsPath = '/getposts/:key/:id';
router.get(exports.getPostsPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_1.GetPosts(req, res, { sortOptions: { mostRecent: true } });
        res.status(http_status_codes_1.OK).json({
            posts,
        });
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured getting your posts',
        });
    }
}));
exports.getCampusPostPath = '/getposts/:campusID';
router.get(exports.getCampusPostPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_1.GetCampusPosts(req, res);
        res.status(http_status_codes_1.OK).json({
            posts,
        });
    }
    catch (error) {
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
}));
exports.likePostPath = '/like';
router.post(exports.likePostPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        post_1.LikePost(req, res);
        res.status(http_status_codes_1.OK).json({
            success: 'Liked',
        });
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops Couldn/t like this post',
        });
    }
}));
exports.dislikePostPath = '/dislike';
router.post(exports.dislikePostPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        post_1.DislikePost(req, res);
        res.status(http_status_codes_1.OK).json({
            success: 'Disliked',
        });
    }
    catch (error) {
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
}));
exports.trashPostPath = '/trash';
router.post(exports.trashPostPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        post_1.TrashPost(req, res);
        res.status(http_status_codes_1.OK).json({
            success: 'Trashed',
        });
    }
    catch (error) {
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
}));
exports.default = { router, path };
