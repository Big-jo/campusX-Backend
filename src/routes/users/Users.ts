import { logger } from '../../shared/Logger';
import { Request, Response, Router } from 'express';
import { BAD_REQUEST, CREATED, OK, INTERNAL_SERVER_ERROR } from 'http-status-codes';
import User from '../../models/User.model';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User.model';
import FollowsModel from '../../models/Follow.model';
import FollowingModel from '../../models/Following.model';
// Init router and path
const router = Router();
const path = '/users';

/******************************************************************************
 *                                Create New User
 ******************************************************************************/

// Constants
export const createUserPath = '/create';

/**
 * Create a new user and add to DB
 * Full Path: "GET campusx/api/v1/users/create"
 */
router.post(createUserPath, async (req: Request, res: Response) => {    
    try {
        const foundUser = await User.findOne({ email: req.body.email });
        if (foundUser) {
            res.status(OK).json({
                exists: `Sorry, ${req.body.name} you have an account already, try logging in`,
            });
        } else {
            const userProfile: IUserProfile = {
                level: req.body.userProfile.level,
                university: req.body.userProfile.university,
                department: req.body.userProfile.department,
                gender: req.body.userProfile.gender,
                avatar: req.body.userProfile.avatar,
                bio: req.body.userProfile.bio,
            };
            const user: IUser = new User({
                name: req.body.user.name,
                userTag: `@${req.body.user.userTag}`,
                email: req.body.user.email,
                password: req.body.user.password,
                phone_number: req.body.user.number,
                userProfile,
            });
            // Hash Password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            user.password = hashedPassword;
            const saved = await user.save();

            // jwt
            const payload = { userID: user._id };
            const secret = process.env.JWT_SECRET as string;
            const token = jwt.sign(payload, secret);

            return res.status(CREATED).json({
                userID: user._id,
                token,
                // tslint:disable-next-line: max-line-length
                success: `Your account has been created ${req.body.user.name.split(' ').slice(0, -1).join(' ')}  Welcome`,
                // FIX-ME: The name split
            });
        }

    } catch (error) {
        logger.error(error, error.message);
        return res.status(INTERNAL_SERVER_ERROR).json({ err: 'Oops, an error occurred' });
    }
});

/******************************************************************************
 *                                Login
 ******************************************************************************/

export const loginPath = '/login';

export const errorMessage = 'Oops sorry, error logging you in';

router.post(loginPath, async (req: Request, res: Response) => {

    try {
        const user = await UserModel.findOne({ email: req.body.email });

        if (user) {
            const userPassword = user.password;
            const requestPassword = req.body.password;
            const samePassword = await bcrypt.compare(requestPassword, userPassword);
            if (samePassword) {
                if (req.session!.view >= 0) {
                    UserModel.findOneAndUpdate({ _id: req.session!.userID }, { $inc: { visits: 1 } }).exec();
                    req.session!.view++;
                } else {
                    req.session!.view = 0;
                }
                const payload = { userID: user._id };
                const secret = process.env.JWT_SECRET as string;
                const token = jwt.sign(payload, secret);
                req.session!.userID = user._id;
                // Split full name into first an last name
                req.session!.name = user.name.split(' ').slice(0, -1).join(' ');
                return res.status(OK).json({
                    token,
                    userID: user._id,
                    success: `Welcome back ${user.name.split(' ').slice(0, -1).join(' ')}`,
                });
            } else {
                return res.status(BAD_REQUEST).json({
                    err: 'Oops, Your Details don\'t match what we have ',
                });
            }
        }
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            error: errorMessage,
        });
    }

});
/**********************************************************
 * 
 *                      Follow A User
 * 
 *********************************************************/

export const followUser = '/follow';
export const followErrorMessage = 'Oops, something went wrong';

router.post(followUser, async (req: Request, res: Response) => {
    try {
        const follow = await new FollowsModel({
            target: req.body.target,
            follower: req.body.follower,
        });
        const following = await new FollowingModel({
            follower: req.body.follower,
            target: req.body.target,
        });

        // Update both target and follower documents
        User.findByIdAndUpdate(req.body.target, { $push: { followers: follow._id } }).exec();
        User.findByIdAndUpdate(req.body.follower, { $push: { followings: following._id } }).exec();

        following.save();
        follow.save();
        return res.status(OK).json({
            status: 'following',
        });
        // Send a notification to the target, informing about the follow
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ err: followErrorMessage });
    }
});

/**************************************************************
 *   Generic get route for getting user related data
 *************************************************************/

export const getUserInfo = '/getUser/:id//:searchKey';  /** Accepted info search Keys: followers, followings, */
export const getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(getUserInfo, async (req: Request, res: Response) => {
    try {
        switch (req.params.searchKey) {
            case 'followers':
                const followers = await UserModel.findById(req.params.id, { followers: 1 })
                    // tslint:disable-next-line: max-line-length
                    .populate({path: 'followers', populate: {path: 'target', select: {name: 1, userProfile: 1, userTag: 1}}})
                    .exec();
                res.status(OK).json({
                    followers,
                });
                break;

            case 'followings':
                const followings = await UserModel.findById(req.params.id, { folllowings: 1 })
                    // tslint:disable-next-line: max-line-length
                    .populate({path: 'followings', populate: {path: 'target', select: {name: 1, userProfile: 1, userTag: 1}}})
                    .exec();
                res.status(OK).json({
                    followings,
                });
                break;
            default:
                const user = await User.findById(req.params.id, {password: 0}).exec();
                res.status(OK).json({
                    user,
                });
                break;
        }
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            err: getUserInfoErrMessage,
        });
    }
});

/*****************************************************************
 *                Update User Info
 *****************************************************************/
export const updateUserPath = '/update';
export const  errMessage = 'Oops could not update';
router.post(updateUserPath, async (req: Request, res: Response) => {
   try {
    // Field: Field to update in database
    // Update: Data to update the field with
    const field = req.body.field;
    const id = req.body.id;
    const update = req.body.update;
    User.findOneAndUpdate({_id: id}, {[field]: update}, (err)=>{
        res.json({
            success: 'Your Profile Has Been Updated',
        });
    });

   } catch (error) {
    res.status(INTERNAL_SERVER_ERROR).json({
        err: errMessage,
    })
   }
})
export default { router, path };
