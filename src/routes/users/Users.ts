import { logger } from '../../shared/Logger';
import { Request, Response, Router } from 'express';
import { BAD_REQUEST, CREATED, OK, INTERNAL_SERVER_ERROR } from 'http-status-codes';
import User from '../../models/User.model';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import UserModel from '../../models/User.model';
import FollowsModel from '../../models/Follower.model';
import FollowingModel from '../../models/Following.model';
import { GetCampuses } from '../../controllers/campuses';
import validation from '../../middleware/auth';
// Init router and path
const router = Router();
const path = '/users';
const auth = validation.validateToken;
// tslint:disable-next-line:no-var-requires
// const Notification = require('../../lib/notifications');
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
                res.status(CREATED).json({
                        userID: user._id,
                        token,
                        // tslint:disable-next-line: max-line-length
                        success: `Your account has been created, Welcome ${req.body.user.name.split(' ').slice(0, -1).join(' ')}`,
                        // FIX-ME: The name split
                    })
    } catch (error) {
        logger.error(error, error.message);
        return res.status(INTERNAL_SERVER_ERROR).json({ error: 'Oops, an error occurred' });
    }
});

/******************************************************************************
 *                                Login
 ******************************************************************************/

export const loginPath = '/login';

export const errorMessage = 'Oops sorry, error logging you in';

router.post(loginPath, async (req: Request, res: Response) => {
    try {
        
        
        } else {
            return res.status(BAD_REQUEST).json({
                error: 'Oops, Your Details don\'t match what we have ',
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
    
});

/******************************************************************************
 *                   Generic get route for getting user related data
 ******************************************************************************/

export const getUserInfo = '/getUser/:user/:searchKey';  /** Accepted info search Keys: followers, followings, */
export const getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(getUserInfo, auth, async (req: Request, res: Response) => {
    

/******************************************************************************
 *                              Update User Info
 ******************************************************************************/
export const updateUserPath = '/update';
export const errMessage = 'Oops could not update';
router.post(updateUserPath, async (req: Request, res: Response) => {
    
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
            error: 'Oops an error occured',
        });
    }
});

/******************************************************************************
*                     Get Users From Same And Different Campuses
/******************************************************************************/
export const explorePath = '/explore';
// router.get(explorePath, auth, async (req: Request, res: Response) => {
//     try {
//         const onCampus = [];
//         const otherCampuses = [];

//         // On campus
//         const sameCampus = await UserModel.find({
//             'userProfile.university': req.token.userID.,
//         },
//             {
//                 followings: 1,
//                 followers: 1,
//                 name: 1,
//                 userProfile: 1,
//                 userTag: 1,
//             }).populate([{ path: 'followings' }, { path: 'followers' }]).exec();

//         for (const user of sameCampus) {
//             // tslint:disable-next-line: max-line-length
//             onCampus.push({ user, isFollowed: user.checkIsFollowed(req.token.userID), isFollowing: user.checkIsFollowing(req.token.userID) });
//         }

//         // Other campuses
//         const diffCampuses = await UserModel.find({
//             'userProfile.university': { $ne: req.token.userID.university },
//         }, {
//             followings: 1,
//             followers: 1,
//             name: 1,
//             userProfile: 1,
//             userTag: 1,
//         }).populate([{ path: 'followings' }, { path: 'followers' }]).exec();

//         for (const user of diffCampuses) {
//             // tslint:disable-next-line: max-line-length
//             otherCampuses.push({ user, isFollowed: user.checkIsFollowed(req.token.userID), isFollowing: user.checkIsFollowing(req.token.userID) });
//         }

//         res.status(OK).send({
//             onCampus,
//             otherCampuses,
//         });
//     } catch (error) {
//         logger.error(error);
//         res.status(INTERNAL_SERVER_ERROR).send({
//             error: 'Oops an error just occurred',
//         });
//     }
// });
/******************************************************************************
*                                 Upload Avatar
/******************************************************************************/
export const uploadAvatarPath = '/avatar/upload';
router.post(uploadAvatarPath, auth, upload.single('image'), async (req: Request, res: Response) => {
   
});

/******************************************************************************
 *                          Check If A UserTag Is Available
 /******************************************************************************/
export const availableUserTag = '/userTag/:tag';
router.get(availableUserTag, async (req: Request, res: Response) => {
  try {
      const userTag = await UserModel.findOne({userTag: {$regex: req.params.tag, $options: '$i'}});
      if (userTag) {
          // Return 0 if the userTag exists
          res.status(OK).json(0);
      } else {
          // Return 1 is the userTag doesnt exist
          res.status(OK).json(1);
      }
  } catch (e) {
      logger.error(e);
      res.status(INTERNAL_SERVER_ERROR).json({
          error: 'Oops an error just occurred',
      });
  }

});

/******************************************************************************
*                          Get Follower Notification
/******************************************************************************/
// export const followingNotificationPath = '/notification/follower';
// router.get(followingNotificationPath, auth, async (req: Request, res: Response) => {
//     try {
//         const followers = await FollowsModel.find({ target: req.token.userID
//             .populate('follower', { 'name': 1, 'userTag': 1, 'userProfile.avatar': 1 }).exec();
//         await followers.reverse();
//         res.status(OK).json({
//             followers,
//         }); ,,
//     };  catch (error) {
//         logger.error(error);
//         res.status(INTERNAL_SERVER_ERROR).json({
//             error: 'Oops an error just occured',
//         });,
//   );

/******************************************************************************
 *                          Update FCM-TOKEN
 /******************************************************************************/
export const updateFCMTokenPath = '/fcmUpdate';

router.post(updateFCMTokenPath, auth, async (req: Request, res: Response) => {
    
});
export default { router, path };
