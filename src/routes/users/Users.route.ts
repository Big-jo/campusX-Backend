import { Response, Router, Request } from 'express';
import { CREATED, OK, INTERNAL_SERVER_ERROR, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { User } from '../../entities/User';
import { IUser } from '../../interfaces/IUser';
import multer from 'multer';
import { Utility } from '../../lib/utility';

// Init router and path
const router = Router();
const path = '/users';
const auth = validation.validateToken;

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
        } as IUser;

        const result = await User.CreateUser(user);
        if (result.exist) {
            res.status(BAD_REQUEST).json({ exist: true });
        } else {
            res.status(CREATED).json({
                message: 'User created',
                result: result.token,
            });
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
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
        if (result.token) {
            res.status(CREATED).json({
                message: 'login successful',
                token: result.token,
                user: result.user,
            });
        } else {
            res.status(BAD_REQUEST).json({ exist: false });
        }
    } catch (error) {
        Utility.ErrResponse(res, error);
    }

});
/******************************************************************************
 *                                Follow A User
 ******************************************************************************/

export const followUser = '/follow';
export const followErrorMessage = 'Oops, something went wrong';

router.post(followUser, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.FollowUser(req.body.targetUserID, req.token.userID);
        result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).send();
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});

/******************************************************************************
*                                 Unfollow A User
/******************************************************************************/
export const unfollowed = '/unfollow';
router.post(unfollowed, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.unfollowUser(req.body.targetID, req.token.userID);
        result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).send();
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
})
/******************************************************************************
 *                   Generic get route for getting user related data
 ******************************************************************************/

export const getUserInfo = '/getUser/:searchKey';  // Accepted info search Keys: followers, followings, user
export const getUserInfoErrMessage = 'Oops sorry couldn/t get what you want';
router.get(getUserInfo, auth, async (req: Request, res: Response) => {
    try {
        const userID = req.token.userID;
        const result = await User.GetUser(req.params.searchKey, req.query.targetID, userID);
        res.status(OK).json({
            result,
        });
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});

/******************************************************************************
 *                              Update User Info
 ******************************************************************************/
const updateUserPath = '/update';
const errMessage = 'Oops could not update';
router.post(updateUserPath, auth, async (req: Request, res: Response) => {
    try {
        const field = req.body.field.toLowerCase();
        const result = await User.UpdateUser(field, req.token.userID, req.body.update);
        result === 0 ? res.status(OK).json({ msg: 'Updated' }) : res.status(BAD_REQUEST).json(errMessage);
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
*                                 Update User Profile
/******************************************************************************/
const updateUserProfile = '/update/profile';
router.post(updateUserProfile, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.UpdateUserProfile(req.token.userID, req.body.update);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                     Get Users From Same And Different Campuses
 /******************************************************************************/
export const connectPath = '/connect';
router.get(connectPath, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.ConnectUser(req.token.userID, parseInt(req.query.offset, 10));
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                                 Upload Avatar
 /******************************************************************************/
export const uploadAvatarPath = '/avatar/upload';
router.post(uploadAvatarPath, auth, upload.single('avatar'), async (req: Request, res: Response) => {
    try {
        const result = await User.UploadAvatar(req.file, req.token.userID);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(res, error);
    }
});

/******************************************************************************
 *                          Check If A UserTag Is Available
 /******************************************************************************/
export const availableUserTag = '/userTag/:tag';
router.get(availableUserTag, async (req: Request, res: Response) => {
    try {
        const userTag = await User.AvailableUserTag(req.params.tag);
        userTag === 0 ? res.status(OK).json({ available: true }) : res.status(OK).json({ available: false });
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});

/******************************************************************************
 *                          Get Follower Notification
 /******************************************************************************/
export const followingNotificationPath = '/notification/follower';
export default { router, path };
