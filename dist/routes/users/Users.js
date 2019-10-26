"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Logger_1 = require("../../shared/Logger");
const express_1 = require("express");
const http_status_codes_1 = require("http-status-codes");
const User_model_1 = tslib_1.__importDefault(require("../../models/User.model"));
const bcrypt_1 = tslib_1.__importDefault(require("bcrypt"));
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const User_model_2 = tslib_1.__importDefault(require("../../models/User.model"));
const Follow_model_1 = tslib_1.__importDefault(require("../../models/Follow.model"));
const Following_model_1 = tslib_1.__importDefault(require("../../models/Following.model"));
const campuses_1 = require("../../controllers/campuses");
const aws_sdk_1 = tslib_1.__importDefault(require("aws-sdk"));
const multer_1 = tslib_1.__importDefault(require("multer"));
const auth_1 = tslib_1.__importDefault(require("../../middleware/auth"));
const router = express_1.Router();
const path = '/users';
const auth = auth_1.default.validateToken;
const storage = multer_1.default.memoryStorage();
const upload = multer_1.default({ storage });
exports.createUserPath = '/create';
router.post(exports.createUserPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const foundUser = yield User_model_1.default.findOne({ email: req.body.user.email });
        if (foundUser) {
            res.status(http_status_codes_1.OK).json({
                exists: `Sorry, ${req.body.user.name} you have an account already, try logging in`,
            });
        }
        else {
            const userProfile = {
                university: req.body.userProfile.university,
                department: req.body.userProfile.department,
                gender: req.body.userProfile.gender,
                avatar: req.body.userProfile.avatar,
                bio: req.body.userProfile.bio,
            };
            const user = new User_model_1.default({
                name: req.body.user.name,
                userTag: `@${req.body.user.userTag}`,
                email: req.body.user.email,
                password: req.body.user.password,
                phone_number: req.body.user.number,
                userProfile,
            });
            const saltRounds = 10;
            const hashedPassword = yield bcrypt_1.default.hash(user.password, saltRounds);
            user.password = hashedPassword;
            const saved = yield user.save();
            const payload = { userID: user._id };
            const secret = process.env.JWT_SECRET;
            const token = jsonwebtoken_1.default.sign(payload, secret);
            return res.status(http_status_codes_1.CREATED).json({
                userID: user._id,
                token,
                success: `Your account has been created ${req.body.user.name.split(' ').slice(0, -1).join(' ')}  Welcome`,
            });
        }
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        return res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({ err: 'Oops, an error occurred' });
    }
}));
exports.loginPath = '/login';
exports.errorMessage = 'Oops sorry, error logging you in';
router.post(exports.loginPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_model_2.default.findOne({ email: req.body.email });
        if (user !== null) {
            const userPassword = user.password;
            const requestPassword = req.body.password;
            const samePassword = yield bcrypt_1.default.compare(requestPassword, userPassword);
            if (samePassword) {
                if (req.session.view >= 0) {
                    User_model_2.default.findOneAndUpdate({ _id: req.session.userID }, { $inc: { visits: 1 } }).exec();
                    req.session.view++;
                }
                else {
                    req.session.view = 0;
                }
                const payload = { userID: user._id };
                const secret = process.env.JWT_SECRET;
                const token = jsonwebtoken_1.default.sign(payload, secret);
                req.session.userID = user._id;
                req.session.name = user.name.split(' ').slice(0, -1).join(' ');
                return res.status(http_status_codes_1.OK).json({
                    token,
                    userID: user._id,
                    success: `Welcome back ${user.name.split(' ').slice(0, -1).join(' ')}`,
                });
            }
            else {
                return res.status(http_status_codes_1.BAD_REQUEST).json({
                    err: 'Oops, Your Details don\'t match what we have ',
                });
            }
        }
        else {
            return res.status(http_status_codes_1.BAD_REQUEST).json({
                err: 'Oops, Your Details don\'t match what we have ',
            });
        }
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            error: exports.errorMessage,
        });
    }
}));
exports.followUser = '/follow';
exports.followErrorMessage = 'Oops, something went wrong';
router.post(exports.followUser, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const follow = yield new Follow_model_1.default({
            target: req.body.target,
            follower: req.body.follower,
        });
        const following = yield new Following_model_1.default({
            follower: req.body.follower,
            target: req.body.target,
        });
        User_model_1.default.findByIdAndUpdate(req.body.target, { $push: { followers: follow._id } }).exec();
        User_model_1.default.findByIdAndUpdate(req.body.follower, { $push: { followings: following._id } }).exec();
        following.save();
        follow.save();
        return res.status(http_status_codes_1.OK).json({
            status: 'following',
        });
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({ err: exports.followErrorMessage });
    }
}));
exports.getUserInfo = '/getUser/:user/:id/:searchKey';
exports.getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(exports.getUserInfo, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        switch (req.params.searchKey) {
            case 'followers':
                const followers = yield User_model_2.default.findById(req.params.id, { followers: 1 })
                    .populate({ path: 'followers', populate: { path: 'target', select: { name: 1, userProfile: 1, userTag: 1 } } })
                    .exec();
                res.status(http_status_codes_1.OK).json({
                    followers,
                });
                break;
            case 'followings':
                const followings = yield User_model_2.default.findById(req.params.id, { folllowings: 1 })
                    .populate({ path: 'followings', populate: { path: 'target', select: { name: 1, userProfile: 1, userTag: 1 } } })
                    .exec();
                res.status(http_status_codes_1.OK).json({
                    followings,
                });
                break;
            case 'user':
                const particularUser = yield User_model_2.default.findById(req.params.user, { password: 0 }).exec();
                res.status(http_status_codes_1.OK).json({
                    particularUser,
                    following: particularUser.checkFollowed(req.params.user),
                    followed: particularUser.checkFollowing(req.params.user),
                });
            default:
                const user = yield User_model_1.default.findById(req.params.id, { password: 0 }).exec();
                res.status(http_status_codes_1.OK).json({
                    user,
                });
                break;
        }
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: exports.getUserInfoErrMessage,
        });
    }
}));
exports.updateUserPath = '/update';
exports.errMessage = 'Oops could not update';
router.post(exports.updateUserPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = req.body.field;
        const id = req.body.id;
        const update = req.body.update;
        User_model_1.default.findOneAndUpdate({ _id: id }, { [field]: update }, (err) => {
            res.json({
                success: 'Your Profile Has Been Updated',
            });
        });
    }
    catch (error) {
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: exports.errMessage,
        });
    }
}));
exports.getCampusesPath = '/getcampuses';
router.get(exports.getCampusesPath, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const campuses = yield campuses_1.GetCampuses(req, res);
        res.status(http_status_codes_1.OK).json({
            campuses,
        });
    }
    catch (error) {
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
}));
exports.uploadAvatarPath = '/avatar/upload';
router.post(exports.uploadAvatarPath, auth, upload.single('file'), (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        const s3FileURL = process.env.AWS_UvalidationPLOADED_FILE_URL_LINK;
        const s3Bucket = new aws_sdk_1.default.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.token.userID,
            Body: file.buffer,
            contentType: file.mimetype,
            ACL: 'public-read',
        };
        s3Bucket.upload(params, (err, data) => {
            if (err) {
                res.status(500).json({ error: 'Oops an error occured' });
                Logger_1.logger.error(err);
            }
            else {
                User_model_2.default.findByIdAndUpdate(req.body.id, { 'userProfile.avatar': data.Location }).exec();
                res.status(http_status_codes_1.OK).json({ data });
            }
        });
    }
    catch (error) {
        Logger_1.logger.error(error, error.message);
    }
}));
exports.default = { router, path };
