import { Response, Router, Request } from 'express';
import { CREATED, OK, BAD_REQUEST } from 'http-status-codes';
import validation from '../../middleware/auth';
import { User } from '../../entities/User';
import { IUser } from '@interfaces';
import multer from 'multer';
import { Utility } from '@lib';

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
        if (result.exists) {
            res.status(BAD_REQUEST).json(result);
        } else {
            res.status(CREATED).json({
                message: 'User created',
                result,
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
        const result = await User.FollowUser(req.body.targetUserID, req.token.userID, res.locals.primaryCache);
        result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).json({ error: result.error });
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
        const result = await User.unfollowUser(req.body.targetUserID, req.token.userID);
        result === 0 ? res.status(OK).send() : res.status(BAD_REQUEST).json(result.error);
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});
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
router.post(updateUserPath, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.UpdateUser(req.token.userID, req.body.update);
        res.status(OK).json({ msg: 'Updated', token: result });
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
        const result = await User.ConnectUser(req.token.userID, req.query.filter, req.token.campus , parseInt(req.query.offset, 10));
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
 *                                 GET USER POSTS
 /******************************************************************************/
const getUserPosts = '/posts';
router.get(getUserPosts, auth, async (req, res) => {
    try {
        const result = await User.GetUserPosts(req.query.userID,  req.query.postType ,req.query.page, req.query.limit);
        res.status(OK).json({ result });
    } catch (e) {
        Utility.ErrResponse(res, e);
    }
});

/******************************************************************************
*                                 GET CLIENTS POSTS
/******************************************************************************/
export const getClientPosts = '/posts/me';
router.get(getClientPosts, auth, async (req: Request, res: Response) => {
    try {
        const result = await User.GetUserPosts(req.token.userID, req.query.postType, req.query.page, req.query.limit);
        res.status(OK).json({ result });
    } catch (error) {
        Utility.ErrResponse(error, res);
    }
});

/******************************************************************************
*                                 FORGOT PASSWORD
/******************************************************************************/
router.post('/forgot-password', (req, res) => {
    try {
        User.ForgotPassword(req.body.email);

        //@ts-ignore
        res.status(200).send()
    } catch (error) {
        res.status(500).send(error.message)
    }
});

/******************************************************************************
*                                 RESET PASSWORD
/******************************************************************************/
router.post('/reset-password', (req, res) => {
    try {
        User.ResetPassword(req.body.email, req.body.token, req.body.password);

        //@ts-ignore
        res.status(200).send()
    } catch (error) {
        res.status(500).send(error.message)
    }
});

/******************************************************************************
 *                          Get Follower Notification
 /******************************************************************************/
export const followingNotificationPath = '/notification/follower';
export default { router, path };
