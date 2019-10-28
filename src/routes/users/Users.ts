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
import { GetCampuses } from '../../controllers/campuses';
import aws from 'aws-sdk';
import multer from 'multer';
import multers3 from 'multer-s3';
import validation from '../../middleware/auth';
// Init router and path
const router = Router();
const path = '/users';
const auth = validation.validateToken;
/******************************************************************************
*                                 Configuring S3
/******************************************************************************/
// aws.config.update({
//     secretAccessKey: 'abcdefghijklmnopqrstuvwxyz',
//     accessKeyId: 'antigha',
//     region: 'us-east(ohio)',
// });

// const s3 = new aws.S3();
// const upload = multer ({
//     storage: multers3({
//         s3,
//         bucket: 'campusx',
//         key: (req, file, cb) => {
//             console.log(file);
//             cb(null, file.originalname);
//         }
//     }),
// });

const storage = multer.memoryStorage();
const upload = multer({ storage });
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
        const foundUser = await User.findOne({ email: req.body.user.email });
        if (foundUser) {
            res.status(OK).json({
                exists: `Sorry, ${req.body.user.name} you have an account already, try logging in`,
            });
        } else {
            const userProfile: IUserProfile = {
                university: req.body.userProfile.university,
                department: req.body.userProfile.department,
                gender: req.body.userProfile.gender,
                avatar: req.body.userProfile.avatar,
                bio: req.body.userProfile.bio,
            };
            const user: IUser = new User({
                name: req.body.user.name,
                userTag: `${req.body.user.userTag}`,
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
            const payload = { user };
            const secret = process.env.JWT_SECRET as string;
            const token = jwt.sign(payload, secret);

            return res.status(CREATED).json({
                userID: user._id,
                token,
                // tslint:disable-next-line: max-line-length
                success: `Your account has been created, Welcom ${req.body.user.name.split(' ').slice(0, -1).join(' ')}`,
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
        if (user !== null) {
            const userPassword = user.password;
            const requestPassword = req.body.password;
            const samePassword = await bcrypt.compare(requestPassword, userPassword);
            if (samePassword) {
                // if (req.session!.view >= 0) {
                //     UserModel.findOneAndUpdate({ _id: req.session!.userID }, { $inc: { visits: 1 } }).exec();
                //     req.session!.view++;
                // } else {
                //     req.session!.view = 0;
                // }
                const payload = { user };
                const secret = process.env.JWT_SECRET as string;
                const token = jwt.sign(payload, secret);
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
        } else {
            return res.status(BAD_REQUEST).json({
                err: 'Oops, Your Details don\'t match what we have ',
            });
        }
    } catch (error) {

        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({
            error: errorMessage,
        });
    }

});
/******************************************************************************
 *                                Follow A User
 ******************************************************************************/

export const followUser = '/follow';
export const followErrorMessage = 'Oops, something went wrong';

router.post(followUser, auth, async (req: Request, res: Response) => {
    try {
        const follow = await new FollowsModel({
            target: req.body.targetID,
            follower: req.token.user._id,
        });
        const following = await new FollowingModel({
            follower: req.token.user._id,
            target: req.body.targetID,
        });
        // Update both target and follower documents
        User.findByIdAndUpdate(req.body.targetID, { $push: { followers: follow._id } }).exec();
        User.findByIdAndUpdate(req.token.user._id, { $push: { followings: following._id } }).exec();

        following.save();
        follow.save();
        return res.status(OK).json({
            status: `You/re now following` ,
        });
        // Send a notification to the target, informing about the follow
    } catch (error) {
        logger.error(error, error.message);
        res.status(INTERNAL_SERVER_ERROR).json({ err: followErrorMessage });
    }
});

/******************************************************************************
 *                   Generic get route for getting user related data
 ******************************************************************************/

export const getUserInfo = '/getUser/:user/:searchKey';  /** Accepted info search Keys: followers, followings, */
export const getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(getUserInfo, auth, async (req: Request, res: Response) => {
    try {
        switch (req.params.searchKey) {
            case 'followers':
                const followers = await UserModel.findById(req.token.user._id, { followers: 1 })
                    // tslint:disable-next-line: max-line-length
                    .populate({ path: 'followers', populate: { path: 'target', select: { name: 1, userProfile: 1, userTag: 1 } } })
                    .exec();
                res.status(OK).json({
                    followers,
                });
                break;

            case 'followings':
                const followings = await UserModel.findById(req.token.user._id, { folllowings: 1 })
                    // tslint:disable-next-line: max-line-length
                    .populate({ path: 'followings', populate: { path: 'target', select: { name: 1, userProfile: 1, userTag: 1 } } })
                    .exec();
                res.status(OK).json({
                    followings,
                });
                break;
            // Get a particular user
            case 'user':
                const particularUser = await UserModel.findById(req.params.user, { password: 0 }).exec();
                res.status(OK).json({
                    user: particularUser,
                    // This user is  following  model owner
                    following: particularUser!.checkFollowed(req.params.user),
                    // This user is being followed by model owner
                    followed: particularUser!.checkFollowing(req.params.user),
                });
                break;
            default:
                const user = await UserModel.findById(req.token.user._id, { password: 0 }).exec();
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

/******************************************************************************
 *                              Update User Info
 ******************************************************************************/
export const updateUserPath = '/update';
export const errMessage = 'Oops could not update';
router.post(updateUserPath, async (req: Request, res: Response) => {
    try {
        // Field: Field to update in database
        // Update: Data to update the field with
        const field = req.body.field;
        const id = req.body.id;
        const update = req.body.update;
        User.findOneAndUpdate({ _id: id }, { [field]: update }, (err) => {
            res.json({
                success: 'Your Profile Has Been Updated',
            });
        });

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({
            err: errMessage,
        });
    }
});

/******************************************************************************
 *                                  Get Campuses
 ******************************************************************************/
export const getCampusesPath = '/getcampuses';
router.get(getCampusesPath, async (req: Request, res: Response) => {
    try {
        const campuses = await GetCampuses(req, res);
        res.status(OK).json({
            campuses,
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR).json({
            err: 'Oops an error occured',
        });
    }
});

/******************************************************************************
*                     Get Users From Same And Different Campuses
/******************************************************************************/
export const explorePath = '/explore';
router.get(explorePath, auth, async (req: Request, res: Response) => {
    try {
        const onCampus = await UserModel.find({
            'userProfile.university': req.token.user.userProfile.university,
        },
            {
                password: 0,
                followings: 0,
                followers: 0,
            }).exec();
        const otherCampuses = await UserModel.find({
            'userProfile.university': { $ne: req.token.user.userProfile.university },
        }, {
            password: 0,
            followings: 0,
            followers: 0,
        }).exec();
        res.status(OK).send({
            onCampus,
            otherCampuses,
        });
    } catch (error) {
        logger.error(error);
        res.status(INTERNAL_SERVER_ERROR).send({
            err: 'Oops an error just occured',
        });
    }
});
/******************************************************************************
*                                 Upload Avatar
/******************************************************************************/
export const uploadAvatarPath = '/avatar/upload';
router.post(uploadAvatarPath, auth, upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const s3FileURL = process.env.AWS_UvalidationPLOADED_FILE_URL_LINK;

        const s3Bucket = new aws.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: req.token.user._id as string,
            Body: file.buffer,
            contentType: file.mimetype,
            ACL: 'public-read',
        };
        s3Bucket.upload(params, (err: any, data: any) => {
            if (err) {
                res.status(500).json({ error: 'Oops an error occured' });
                logger.error(err);
            } else {
                UserModel.findByIdAndUpdate(req.body.id, { 'userProfile.avatar': data.Location }).exec();
                res.status(OK).json({ data });
            }
        });
    } catch (error) {
        logger.error(error, error.message);
    }
});

export default { router, path };
