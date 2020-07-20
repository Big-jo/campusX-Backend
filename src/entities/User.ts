import UserModel from '../models/User.model';
import {IUser, IUserModel} from 'src/interfaces/IUser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {logger} from '@shared';
import FollowsModel from '../models/Follower.model';
import FollowingModel from '../models/Following.model';
import PostModel from '../models/Post.model';
import {Utility} from '../lib/utility';
import {S3} from '../lib/s3';
// import * as Notifications from '../lib/notifications';
// import Notifications from '../lib/notifications';
export class User {

    public static async CreateUser(userObject: IUser) {
        const foundUser = await UserModel.findOne({email: userObject.email});
        if (foundUser) {
            return {exist: true};
        } else {
            try {
                const user: IUserModel = new UserModel({
                    name: userObject.name,
                    userID: '',
                    userTag: `${userObject.userTag}`,
                    email: userObject.email,
                    password: userObject.password,
                });
                user.userID = user._id;
                const rounds = await bcrypt.genSalt(10);

                // Hash Password
                user.password = await bcrypt.hash(user.password, rounds);
                await user.save();
                const payload = {
                    userID: user._id,
                    userTag: user.userTag,
                    campus: user.userProfile.university,
                    // userProfile: user.userProfile,
                };
                return {token: Utility.createToken(payload), user: {userTag: user.userTag}};
            } catch (error) {
                logger.error(error);
                throw new Error(error);
            }
        }
    }

    public static async Login(email: string, password: string) {
        try {
            const user = await UserModel.findOne({email}).exec();
            if (user !== null) {
                const userPassword = user.password;
                const result = await bcrypt.compare(password, userPassword);
                if (result) {
                    const payload = {
                        userID: user._id,
                        // userProfile: user.userProfile,
                    };
                    const secret = process.env.JWT_SECRET as string;
                    const token = jwt.sign(payload, secret);
                    return {
                        token,
                        user: {userTag: user.userTag, university: user.userProfile.university},
                    };
                } else {
                    return {incorrect: true};
                }
            } else {
                return {exist: false};
            }
        } catch (error) {
            throw new Error(error);
        }
    }

    public static async FollowUser(targetUserID: string, userID: string) {
        try {
            // const target = await UserModel.findById(targetUserID, {userTag: 1}).lean().exec();

            const follow = await new FollowsModel({
                target: targetUserID,
                follower: userID,
            });

            const following = await new FollowingModel({
                follower: userID,
                target: targetUserID,
            });
            // TODO: Add typings support for FCM-NODE
            // TODO: Make notifications function async
            // const notif = new Notifications('Campus', `${target!.userTag} followed you`, target!.fcm_token);
            // notif.send();

            await following.save();
            await follow.save();
            return 0;
            // TODO: Send a notification to the target, informing about the follow
        } catch (error) {
            logger.error(error, error.message);
            throw new Error(error);
        }
    }

    public static async GetUser(searchKey: string, userID: string) {
        try {
            switch (searchKey) {
                case 'followers':
                    const followers = await FollowsModel.find({target: userID})
                        .lean()
                        .populate('follower', {name: 1, userProfile: 1, userTag: 1, avatar: 1})
                        .exec();
                    return {followers};

                case 'followings':
                    const followings = await FollowingModel.find({follower: userID})
                    // tslint:disable-next-line: max-line-length
                        .lean()
                        .populate('target', {name: 1, userProfile: 1, userTag: 1, avatar: 1})
                        .exec();
                    return {followings};

                case 'user':
                    const user = await UserModel.findById(userID, {password: 0});
                    if (user != null) {
                        return {user};
                    }
                    return {exist: false};
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

    public static async UpdateUser(field: string, userID: string, update: any) {
        try {
            /**
             *  Field: Field to update in database
             *  Update: Data to update the field with
             */

            await UserModel.findOneAndUpdate({_id: userID}, {[field]: update});
            return 0;

        } catch (error) {
            logger.error(error);
        }
    }

    public static async UpdateUserProfile(userID: string, update: any) {
        try {
            await UserModel.update({_id: userID}, {
                $set: {
                    'userProfile.university': update.university,
                    'userProfile.gender': update.gender,
                    'userProfile.bio': update.bio,
                },
            });

            return 0;

        } catch (error) {
            logger.error(error.error);
        }
    }

    public static async UploadAvatar(file: any, userID: string) {
        try {
            const s3 = new S3(userID, file, 'avatars');
            return await s3.UploadAvatar();
        } catch (error) {
            logger.error(error, error.message);
        }
    }

    public static async GetUserPosts(userID: string) {
        try {
            const posts = await PostModel.find({author: userID})
                .populate({path: 'author', select: {name: 1, userProfile: 1, userTag: 1}})
                .exec();
            return posts.reverse();
        } catch (error) {
            logger.log(error);
        }
    }

    public static async AvailableUserTag(userTag: string) {
        const available = await UserModel.findOne({userTag: {$regex: userTag, $options: '$i'}});
        if (available) {
            // Return 0 if the userTag exists
            return 0;
        } else {
            // Return 1 is the userTag doesnt exist
            return 1;
        }
    }

    public static async ConnectUser(userID: string, campus: string) {

        const user = await UserModel.findById(userID).lean().exec();

        const onCampusUsers = await UserModel.find(
            {'userProfile.university': user!.userProfile.university},
            {name: 1, userProfile: 1, userTag: 1, _id: 1},
        ).lean().exec();
        const onOtherCampuses = await UserModel.find(
            {'userProfile.university': {$ne: user!.userProfile.university}},
            {name: 1, userProfile: 1, userTag: 1, _id: 1},
        ).lean().exec();

        const users = onCampusUsers.concat(onOtherCampuses) as IUserModel[];
        const userIDs = users.map(userObjects => userObjects._id);

        const followings = await FollowsModel.find({target: {$in: userIDs}, follower: userID}).lean().exec();
        // const followers = await FollowingModel.find({follower: {$in: userIDs}, target: userID}).lean().exec();

        const connectUsers: IUserModel[] = [];

        users.forEach((userObject: any) => {
            // const arr = [];
            for (const following of followings) {
                userObject.checkIsFollowing = userObject._id.toString() === following.target.toString();
            }
            userObject.sameCampus = userObject.userProfile.university === campus;
            connectUsers.push(userObject);
        });

        return {
            connectUsers,
        };
    }
}
