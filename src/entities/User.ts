import UserModel from '../models/User.model';
import { IUser } from 'src/interfaces/IUser';
import bcrypt from 'bcrypt';
import { logger } from '@shared';
import FollowsModel from '../models/Follower.model';
import FollowingsModel from '../models/Following.model';
import PostModel from '../models/Post.model';
import { Utility } from '@lib';
import { S3 } from '@lib';
import { ITokenPayload } from '../interfaces/ITokenPayload';
import { Notification } from '../lib/notifications';
import { AggregationQueries } from '../lib/aggregationQueries';

// import * as Notifications from '../lib/notifications';
// import Notifications from '../lib/notifications';
// tslint:disable-next-line:no-var-requires
// const  ObjectId = require('mongoose').Types.ObjectId;

export class User {

    public static async CreateUser(userObject: IUser) {
        const foundUser = await UserModel.findOne({ email: userObject.email }).exec();
        if (foundUser) {
            return { exists: true, err_message: 'This user exists' };
        } else {
            try {
                // check if userTag is available
                const foundUser = await UserModel.findOne({ userTag: userObject.userTag }).exec();
                if (foundUser) {
                    console.log(foundUser);
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
                        userTag: `${userObject.userTag}`,
                        email: userObject.email.toLowerCase(),
                        password: userObject.password,
                    });
                    user.userID = user._id;
                    const rounds = await bcrypt.genSalt(10);

                    // Hash Password
                    user.password = await bcrypt.hash(user.password, rounds);
                    await user.save();

                    const payload: ITokenPayload = {
                        userID: user.id,
                        userTag: user.userTag,
                        campus: user.userProfile.university,
                        name: user.name,
                        avatar: user.userProfile.avatar != null ? user.userProfile.avatar : null,
                        fcm_token: user.fcm_token,
                        // userProfile: user.userProfile,
                    };

                    return { token: Utility.createToken(payload), user: { userTag: user.userTag, userID: user.id, avatar: user.userProfile.avatar } };
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
                        fcm_token: user.fcm_token
                    };

                    const token = Utility.createToken(payload);

                    return {
                        token,
                        user: { userTag: user.userTag, university: user.userProfile.university, avatar: user.userProfile.avatar, userID: user._id },
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

    public static async FollowUser(targetUserID: string, userID: string) {
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

                // TODO: Add typings support for FCM-NODE
                // TODO: Make notifications function async
                // const notif = new Notifications('Campus', `${target!.userTag} followed you`, target!.fcm_token);
                // notif.send();

                following.save();
                follow.save();
                const follower = await UserModel.findByIdAndUpdate({ _id: userID }, { $inc: { 'userProfile.followings': 1 } }).exec();
                const user = await UserModel.findByIdAndUpdate({ _id: targetUserID }, { $inc: { 'userProfile.followers': 1 } }).exec();

                const deviceToken = user.fcm_token
                new Notification(deviceToken, {
                    title: 'New Follower',
                    body: `${user.userTag} followed you`,
                    sound: 'default',
                }, targetUserID, follower.userProfile.avatar, 'follower').SendPushNotification();

                return 0;
            } else {
                return { error: 'You follow this user already' };
            }
            // TODO: Send a notification to the target, informing about the follow
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

            return { token: Utility.createToken(payload) };

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

    public static async GetUserPosts(userID: string, page: number, limit: number) {
        try {
            const posts = await AggregationQueries.GetUserPostsAggreg(userID, { page, limit });

            return { userPosts: posts.docs.reverse() };

        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async AvailableUserTag(userTag: string) {
        const available = await UserModel.findOne({ userTag: { $regex: userTag, $options: '$i' } });
        if (available) {
            // Return 0 if the userTag exists
            return 0;
        } else {
            // Return 1 is the userTag doesnt exist
            return 1;
        }
    }

    public static async ConnectUser(userID: string, offset: number) {
        const [user, users] = await Promise.all([UserModel.findById(userID).lean().exec(), UserModel.paginate({}, {
            offset,
            limit: 10,
            select: 'name userProfile userTag _id',
            lean: true,
        },
        )]);

        const connectUsers = [];

        for (const userObject of users.docs as any) {
            if (userObject.id !== userID) {
                userObject.userProfile.university === user.userProfile.university ? userObject.sameCampus = true : userObject.sameCampus = false;
                connectUsers.push(userObject);
            }
        }

        return {
            connectUsers,
        };
    }
}
