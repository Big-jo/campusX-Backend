import { logger } from '../../shared/Logger';
import { Request, Response, Router } from 'express';
import { BAD_REQUEST, CREATED, OK, INTERNAL_SERVER_ERROR } from 'http-status-codes';
import validation from '../../middleware/auth';
import { User } from '../../entities/User';
import { IUser } from '../../interfaces/IUser';
import multer from 'multer';
import {Utility} from '../../lib/utility';
// Init router and path
const router = Router();
const path = '/users';
const auth = validation.validateToken;
const errMsg = { error: 'Oops, an error occurred' };

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
		const user: IUser = {
			email: req.body.email,
			name: req.body.name,
			password: req.body.password,
			phone_number: req.body.phoneNumber,
			userTag: req.body.userTag,
		};
		const result = await User.CreateUser(user);
		if (result.exist) {
			res.status(BAD_REQUEST).json({exist: true});
		} else {
			res.status(CREATED).json({
				message: 'User created',
				result: result.token,
			});
		}
	} catch (error) {
		logger.error(error, error.message);
		return res.status(INTERNAL_SERVER_ERROR).json();
	}
});

/******************************************************************************
 *                                Login
 ******************************************************************************/

export const loginPath = '/login';

export const errorMessage = 'Oops sorry, error logging you in';

router.post(loginPath, async (req: Request, res: Response) => {
	try {
		const result = await User.Login(req.body.email, req.body.password);
		logger.log('info', req.body);
		if (result.token) {
			res.status(CREATED).json({
				message: 'login successful',
				token: result.token,
			});
		} else {
			res.status(BAD_REQUEST).json({exist: false});
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
		const result = await User.FollowUser(req.body.targetUserID, req.body.password);
		result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).send();
	} catch (e) {
		Utility.ErrResponse(res);
	}

});

/******************************************************************************
 *                   Generic get route for getting user related data
 ******************************************************************************/

export const getUserInfo = '/getUser/:user/:searchKey';  /** Accepted info search Keys: followers, followings, */
export const getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(getUserInfo, auth, async (req: Request, res: Response) => {
	try {
		const result = await User.GetUser(req.params.searchKey, req.token.userID);
		res.status(OK).json({
			result,
		});
	} catch (e) {
		Utility.ErrResponse(res);
	}
});

/******************************************************************************
 *                              Update User Info
 ******************************************************************************/
export const updateUserPath = '/update';
export const errMessage = 'Oops could not update';
router.post(updateUserPath, auth, async (req: Request, res: Response) => {
	try {
		const result = await User.UpdateUser(req.body.field, req.token.userID, req.body.update);
		result === 0 ? res.status(OK).json({msg: 'Updated'}) : res.status(BAD_REQUEST).json(errMessage);
	} catch (error) {
		Utility.ErrResponse(res);
	}
});

/******************************************************************************
 *                                  Get Campuses
 ******************************************************************************/
// export const getCampusesPath = '/getcampuses';
// router.get(getCampusesPath, async (req: Request, res: Response) => {
//     try {
//         const campuses = await GetCampuses(req, res);
//         res.status(OK).json({
//             campuses,
//         });
//     } catch (error) {
//         res.status(INTERNAL_SERVER_ERROR).json({
//             error: 'Oops an error occured',
//         });
//     }
// });

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
	try {
		const result = await User.UploadAvatar(req.file, req.token.userID);
		res.status(OK).json({result});
	} catch (error) {
		Utility.ErrResponse(res);
	}
});

/******************************************************************************
 *                          Check If A UserTag Is Available
 /******************************************************************************/
export const availableUserTag = '/userTag/:tag';
router.get(availableUserTag, async (req: Request, res: Response) => {
	try {
		const userTag = await User.AvailableUserTag(req.params.tag);
		userTag === 0 ? res.status(OK).json({available: true}) : res.status(OK).json({available: false});
	} catch (e) {
		Utility.ErrResponse(res);
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

export default { router, path };
