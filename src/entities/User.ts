import { Gravatar, Notification, S3, Utility } from '@lib';
import { logger } from '@shared';
import bcrypt from 'bcrypt';
import IORedis from 'ioredis';
import shortid from "shortid";
import { BadRequestError } from 'src/errors';
import { IUser } from 'src/interfaces/IUser';
import { ITokenPayload } from '../interfaces/ITokenPayload';
import { AggregationQueries } from '../lib/aggregationQueries';
import FollowsModel from '../models/Follower.model';
import FollowingsModel from '../models/Following.model';
import UserModel from '../models/User.model';
import { EmailService } from '../services/email.service';
import { Post } from './Post';

// import * as Notifications from '../lib/notifications';
// import Notifications from '../lib/notifications';
// tslint:disable-next-line:no-var-requires
const  ObjectId = require('mongoose').Types.ObjectId;

export class User {

    public static async CreateUser(userObject: IUser) {
        const foundUser = await UserModel.findOne({ email: userObject.email.toLowerCase() }).exec();
        if (foundUser) {
            throw new BadRequestError('This email is already registered. Please sign in or use a different email.');
        } else {
            try {
                // check if userTag is available
                const foundUser = await UserModel.findOne({ userTag: userObject.userTag.toLowerCase() }).exec();
                if (foundUser) {
                    return { exists: true, err_message: 'This userTag has been taken already' };
                } else {
                    const user = new UserModel({
                        name: userObject.name,
                        userProfile: userObject.userProfile != null ? {
                            avatar: userObject.userProfile.avatar,
                            bio: userObject.userProfile.bio,
                            gender: userObject.userProfile.gender,
                            university: userObject.userProfile.university,
                        } : null,
                        userID: '',
                        userTag: `${userObject.userTag.toLowerCase()}`,
                        email: userObject.email.toLowerCase(),
                        password: userObject.password,
                    });
                    user.userID = user._id;

                    if (!user.userProfile.avatar) {
                        user.userProfile.avatar = Gravatar.generate(user.email, 500, 'identicon');
                    }

                    const rounds = await bcrypt.genSalt(10);
                    // Hash Password
                    user.password = await bcrypt.hash(user.password, rounds);

                    // Reset Token 
                    user.resetToken = await bcrypt.hash(user.userTag, rounds);

                    let savedUser = await user.save();
                    savedUser = savedUser.toObject();
                    delete savedUser.password;

                    const payload: ITokenPayload = {
                        userID: user.id,
                        userTag: user.userTag,
                        campus: user.userProfile.university,
                        name: user.name,
                        avatar: user.userProfile.avatar != null ? user.userProfile.avatar : null,
                        fcm_token: user.fcm_token,
                        // userProfile: user.userProfile,
                    };
                    return { token: Utility.createToken(payload), user: savedUser };
                }

            } catch (error) {
                logger.error(error);
                throw new Error(error);
            }
        }
    }

    public static async Login(email: string, password: string) {
        try {
            const user = await UserModel.findOne({ email }).lean().exec();
            if (user !== null) {
                const userPassword = user.password;
                const result = await bcrypt.compare(password, userPassword);

                if (result) {
                    const payload: ITokenPayload = {
                        userID: user._id,
                        userTag: user.userTag,
                        campus: user.userProfile.university,
                        name: user.name,
                        avatar: user.userProfile.avatar != null ? user.userProfile.avatar : null,
                        fcm_token: user.fcm_token,
                    };

                    const token = Utility.createToken(payload);
                    delete user.password;
                    return {
                        token,
                        user,
                    };
                } else {
                    return { incorrect: true };
                }
            } else {
                return { exist: false };
            }
        } catch (error) {
            throw new Error(error);
        }
    }

    public static async FollowUser(targetUserID: string, userID: string, primaryCache: IORedis.Redis) {
        try {
            // Check is user is following target already
            const isFollowing = await FollowsModel.findOne({
                target: targetUserID,
                follower: userID,
            }).lean().exec();

            if (isFollowing === null || undefined) {
                // const target = await UserModel.findById(targetUserID, {userTag: 1}).lean().exec();

                /**
                 * Contains documents of everyone the user follows
                 */
                const follow = await new FollowsModel({
                    target: targetUserID,
                    follower: userID,
                });

                /**
                 * Contains documents of everyone that follows a user
                 */
                const following = await new FollowingsModel({
                    follower: userID,
                    target: targetUserID,
                });

                following.save();
                follow.save();
                const follower = await UserModel.findByIdAndUpdate({ _id: userID }, { $inc: { 'userProfile.followings': 1 } }).exec();
                const user = await UserModel.findByIdAndUpdate({ _id: targetUserID }, { $inc: { 'userProfile.followers': 1 } }).exec();

                const deviceToken = user.fcm_token;
                new Notification(deviceToken, {
                    title: 'New Follower',
                    body: `${follower.userTag} followed you`,
                    sound: 'default',
                }, targetUserID, follower.userProfile.avatar, 'follower', follower._id).SendPushNotification();

                // Add target user's recent post to user's feed 
                Post.AddToFeed(userID, targetUserID, primaryCache);
                return 0;
            } else {
                return { error: 'You follow this user already' };
            }
        } catch (error) {
            logger.error(error, error.message);
            throw new Error(error);
        }
    }

    public static async unfollowUser(targetUserID: string, userID: string) {
        const foundFollows = await FollowsModel.findOne({
            target: targetUserID,
            follower: userID,
        }).exec();
        if (foundFollows !== null) {
            try {

                FollowsModel.deleteOne({
                    target: targetUserID,
                    follower: userID,
                }).exec();

                FollowingsModel.deleteOne({
                    follower: userID,
                    target: targetUserID,
                }).exec();

                UserModel.updateOne({ _id: userID }, { $inc: { 'userProfile.followings': -1 } }).exec();
                UserModel.updateOne({ _id: targetUserID }, { $inc: { 'userProfile.followers': -1 } }).exec();

                return 0;
            } catch (error) {
                logger.error(error, error.message);
                throw new Error(error);
            }
        } else {
            return { error: 'Not following this user' };
        }
    }

    public static async GetUser(searchKey: string, targetID?: string, userID?: string) {
        try {
            switch (searchKey) {
                case 'follows':
                    const follows = await FollowsModel.find({ follower: userID })
                        .lean()
                        .populate('target', { name: 1, userProfile: 1, userTag: 1, avatar: 1 })
                        .exec();
                    return { follows };

                case 'followings':
                    const followings = await FollowingsModel.find({ follower: userID, target: targetID })
                        // tslint:disable-next-line: max-line-length
                        .lean()
                        .populate('target', { name: 1, userProfile: 1, userTag: 1, avatar: 1 })
                        .exec();
                    return { followings };

                case 'self':

                    const self = await UserModel.findById(userID, { password: 0 }).lean().exec();

                    if (self != null) {
                        return { self };
                    }
                    return { exist: false };

                case 'user':

                    const user = await UserModel.findById(targetID, { password: 0 }).lean().exec();

                    const isFollowing = await FollowsModel.findOne({ target: targetID, follower: userID }).exec();
                    if (user === null || undefined) { return { exist: false }; }

                    if (isFollowing != null) {
                        return {
                            user,
                            isFollowing: true,
                        };
                    } else {
                        return {
                            user,
                            isFollowing: false,
                        };
                    }

                default:
                    break;
            }
        } catch (error) {
            logger.error(error, error.message);
            throw new Error(error);
        }
    }

    /**
     * @static
     * @memberof User
     */

    public static async UpdateUser(userID: string, updates: { [x: string]: string }) {
        try {
            const update: { [x: string]: string } = {};
            for (const key in updates) {
                if (updates.hasOwnProperty(key)) {
                    update[key] = updates[key];
                }
            }
            
            if (update.password !== undefined) {
                const rounds = await bcrypt.genSalt(10);
                // Hash Password
                update.password = await bcrypt.hash(updates.password, rounds);
            }

            const updated = await UserModel.findOneAndUpdate({ _id: userID }, { $set: update }).lean().exec();
            const payload: ITokenPayload = {
                avatar: updated.userProfile.avatar,
                campus: updated.userProfile.university,
                name: updated.userProfile.name,
                userID,
                userTag: updated.userTag,
                fcm_token: updated.fcm_token,
            };
            return Utility.createToken(payload);

        } catch (error) {
            logger.error(error);
        }
    }

    public static async UpdateUserProfile(userID: string, update: any) {
        try {
            const user = await UserModel.findOneAndUpdate({ _id: userID }, {
                $set: {
                    'userProfile.university': update.university,
                    'userProfile.gender': update.gender,
                    'userProfile.bio': update.bio,
                },
            }).exec();

            const payload: ITokenPayload = {
                avatar: user.userProfile.avatar,
                campus: update.university,
                name: user.name,
                userID: user._id,
                userTag: user.userTag,
                fcm_token: user.fcm_token,
            };

            return { token: Utility.createToken(payload), user: {userID} };

        } catch (error) {
            logger.error(error.error);
        }
    }

    public static async UploadAvatar(file: any, userID: string) {
        try {
            const s3 = new S3(userID, file, 'avatars');
            const data = await s3.UploadAvatar() as any;
            const user = await UserModel.findByIdAndUpdate(userID, { 'userProfile.avatar': data.Location }).exec();

            const payload: ITokenPayload = {
                avatar: data.Location,
                campus: user.userProfile.university,
                name: user.name,
                userID: user.id,
                userTag: user.userTag,
                fcm_token: user.fcm_token,
            };

            return { token: Utility.createToken(payload), data };
        } catch (error) {
            logger.error(error, error.message);
        }
    }

    public static async GetUserPosts(userID: string, type: string ,page: number, limit: number) {
        try {
            const posts = await AggregationQueries.GetUserPostsAggreg(userID, type, { page, limit });

            return { userPosts: posts.reverse() };

        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async AvailableUserTag(userTag: string) {
        const available = await UserModel.findOne({ userTag: { $regex: userTag, $options: 'i' } }).limit(20);
        if (available) {
            // Return 0 if the userTag exists
            return 0;
        } else {
            // Return 1 is the userTag doesnt exist
            return 1;
        }
    }

    public static async ConnectUser(userID: string, filter: string , campus: string, offset: number) {
        // variable declarations
        // let users;
        let connectUsers;

        if (filter === 'sameCampus') {
            connectUsers = await UserModel.find({ 'userProfile.university': campus, _id: {$ne: ObjectId(userID)} }, {name: 1, userProfile: 1, userTag: 1}).lean().exec();
        } else {
            connectUsers = await UserModel.find({ 'userProfile.university': {$ne: campus} }, {name: 1, userProfile: 1, userTag: 1}).lean().exec();
        };


        return {connectUsers};
    }

    public static async ResetPassword(email: string, token: string, newPassword: string) {
        try {
            const user = UserModel.findOne({ resetToken: token }).lean().exec();

            if (!!user) {
                const rounds = await bcrypt.genSalt(10);
                    // Hash Password
                    const updatedPasswordHash = await bcrypt.hash(newPassword, rounds);
                    await UserModel.update({ resetToken: token }, {$set: {password: updatedPasswordHash}}).exec();

            } else {
                throw new Error('Wrong Token')
            }

        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async ForgotPassword(email: string) {
        try {
            //@ts-ignore
            const user = await UserModel.findOne({ email }).lean().exec();

            if (!!user) {
                const sid = shortid.generate();

                UserModel.update({email}, {$set: {resetToken: sid}}).exec();

                const body = `Hi ${user.name}, we heard you forgot your password, here is your unique key: ${sid}`

                const html = `
                <!DOCTYPE html>
                <html>
                <head>
                <!-- HTML Codes by Quackit.com -->
                <title>
                Campusx  Password Reset </title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                body {background-color:#ffffff;background-repeat:no-repeat;background-position:top left;background-attachment:fixed;}
                h3{font-family:Helvetica, sans-serif;color:#000000;background-color:#ffffff;}
                p {font-family:Helvetica, sans-serif;font-size:14px;font-style:normal;font-weight:normal;color:#000000;background-color:#ffffff;}
                </style>
                </head>
                <body>
                <h3>Forgot Password</h3>
                <p>Hi hi, we heard you forgot your password, here you go, your unique code: <b>${sid}</b></p>
                </body>
                </html>
                
                `
                const emailService = new EmailService(email, 'Reset Password', body, html)
                emailService.send();

            }

        } catch (err) {
            logger.error(err);
        }
    }
}
