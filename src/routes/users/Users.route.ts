import { Response, Router, Request } from "express";
import { CREATED, OK, BAD_REQUEST } from "http-status-codes";
import validation from "../../middleware/auth";
import { User } from "../../entities/User";
import { IUser } from "@interfaces";
import multer from "multer";
import { Utility } from "@lib";
import crypto from "crypto";
import { JsonWebTokenError } from "jsonwebtoken";

// Init router and path
const router = Router();
const path = "/users";
const auth = validation.validateToken;

const storage = multer.memoryStorage();
const upload = multer({ storage });
/******************************************************************************
 *                                Create New User
 ******************************************************************************/

// Constants
export const createUserPath = "/create";

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
        message: "User created",
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

export const loginPath = "/login";

export const errorMessage = "Oops sorry, error logging you in";

router.post(loginPath, async (req: Request, res: Response) => {
  try {
    const result = await User.Login(req.body.email, req.body.password);
    if (result.token) {
      res.status(CREATED).json({
        message: "login successful",
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

export const followUser = "/follow";
export const followErrorMessage = "Oops, something went wrong";

router.post(followUser, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.FollowUser(
      req.body.targetUserID,
      req.token.userID,
      res.locals.primaryCache
    );
    result === 0
      ? res.status(OK).send()
      : res.status(BAD_REQUEST).json({ error: result.error });
  } catch (e) {
    Utility.ErrResponse(res, e);
  }
});

/******************************************************************************
*                                 Unfollow A User
/******************************************************************************/
export const unfollowed = "/unfollow";
router.post(unfollowed, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.unfollowUser(
      req.body.targetUserID,
      req.token.userID
    );
    result === 0
      ? res.status(OK).send()
      : res.status(BAD_REQUEST).json(result.error);
  } catch (e) {
    Utility.ErrResponse(res, e);
  }
});
/******************************************************************************
 *                   Generic get route for getting user related data
 ******************************************************************************/

export const getUserInfo = "/getUser/:searchKey"; // Accepted info search Keys: followers, followings, user
export const getUserInfoErrMessage = "Oops sorry couldn/t get what you want";
router.get(getUserInfo, auth, async (req: Request, res: Response) => {
  try {
    const userID = req.token.userID;
    const result = await User.GetUser(
      req.params.searchKey,
      req.query.targetID,
      userID
    );
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
const updateUserPath = "/update";
router.post(updateUserPath, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.UpdateUser(req.token.userID, req.body.update);
    res.status(OK).json({ msg: "Updated", token: result });
  } catch (error) {
    Utility.ErrResponse(res, error);
  }
});

/******************************************************************************
*                                 Update User Profile
/******************************************************************************/
const updateUserProfile = "/update/profile";
router.post(updateUserProfile, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.UpdateUserProfile(
      req.token.userID,
      req.body.update
    );
    res.status(OK).json({ result });
  } catch (error) {
    Utility.ErrResponse(res, error);
  }
});

/******************************************************************************
 *                     Get Users From Same And Different Campuses
 /******************************************************************************/
export const connectPath = "/connect";
router.get(connectPath, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.ConnectUser(
      req.token.userID,
      req.query.filter,
      req.token.campus,
      parseInt(req.query.offset, 10)
    );
    res.status(OK).json({ result });
  } catch (error) {
    Utility.ErrResponse(res, error);
  }
});

/******************************************************************************
 *                                 Upload Avatar
 /******************************************************************************/
export const uploadAvatarPath = "/avatar/upload";
router.post(
  uploadAvatarPath,
  auth,
  upload.single("avatar"),
  async (req: Request, res: Response) => {
    try {
      const result = await User.UploadAvatar(req.file, req.token.userID);
      res.status(OK).json({ result });
    } catch (error) {
      Utility.ErrResponse(res, error);
    }
  }
);

/******************************************************************************
 *                          Check If A UserTag Is Available
 /******************************************************************************/
export const availableUserTag = "/userTag/:tag";
router.get(availableUserTag, async (req: Request, res: Response) => {
  try {
    const userTag = await User.AvailableUserTag(req.params.tag);
    userTag === 0
      ? res.status(OK).json({ available: true })
      : res.status(OK).json({ available: false });
  } catch (e) {
    Utility.ErrResponse(res, e);
  }
});

/******************************************************************************
 *                                 GET USER POSTS
 /******************************************************************************/
const getUserPosts = "/posts";
router.get(getUserPosts, auth, async (req, res) => {
  try {
    const result = await User.GetUserPosts(
      req.query.userID,
      req.query.page,
      req.query.limit
    );
    res.status(OK).json({ result });
  } catch (e) {
    Utility.ErrResponse(res, e);
  }
});

/******************************************************************************
*                                 GET CLIENTS POSTS
/******************************************************************************/
export const getClientPosts = "/posts/me";
router.get(getClientPosts, auth, async (req: Request, res: Response) => {
  try {
    const result = await User.GetUserPosts(
      req.token.userID,
      req.query.page,
      req.query.limit
    );
    res.status(OK).json({ result });
  } catch (error) {
    Utility.ErrResponse(error, res);
  }
});
/******************************************************************************
 *                          Get Follower Notification
 /******************************************************************************/
export const followingNotificationPath = "/notification/follower";

/******************************************************************************
*                              Verify user email
/******************************************************************************/
const verifyUserEmail = "/verify_email";
router.post(verifyUserEmail, async (req: Request, res: Response) => {
  // Get Auth Token
  const authToken = req.header("AuthToken");

  // Create otp
  const OTP = crypto.randomBytes(64).toString("hex").substr(0, 6);
  // Check Auth Token
  if (authToken !== null && authToken === process.env.AUTH_TOKEN) {
    const { email } = req.body;
    if (email) {
      // Validate email address
      if (
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
          email
        )
      ) {
        try {
          const { exists, err_message } = await User.GetUserWithEmail(email);
          if (exists) {
            // Save otp to User document update or overwrite existing
            const { save, emailaddress } = await User.saveOTP(OTP, email);
            if (save) {
              //TODO: send the User a mail with the otp

              // Create token with email
              const token = await Utility.createToken(emailaddress);

              // Send response
              res.status(OK).json({ message: token });
            } else {
              res.status(401).json({ message: "Something went wrong" });
            }
          } else {
            res.status(401).json({ message: err_message });
          }
        } catch (err) {
          res.status(401).json({ message: "Something went wrong" });
        }
      } else {
        res.status(401).json({ message: "Invalid email address." });
      }
    } else {
      res
        .status(401)
        .json({ message: "You have to provide an email address." });
    }
  } else {
    res
      .status(401)
      .json({ message: "You are not allowed to use this service" });
  }
});

/******************************************************************************
*                                 Reset User password
/******************************************************************************/
const resetUserPassword = "/password_reset";
router.post(resetUserPassword, auth, async (req: Request, res: Response) => {
  // Get Auth Token
  const authToken = req.header("AuthToken");
  // body
  const { newpassword, otp } = req.body;
  console.log(req.token);
  // Check Auth Token
  if (authToken !== null && authToken === process.env.AUTH_TOKEN) {
    if (newpassword && otp) {
      // Get user with email
      const { emailUser } = await User.GetUserWithEmail(req.token.toString());
      if (emailUser) {
        if (emailUser.otp.toString() === otp.toString()) {
          // Change password
          const { changed } = await User.changePassword(
            emailUser.email,
            newpassword
          );
          if (changed) {
            res.status(OK).json({ message: "User password has been reset" });
          } else {
            res.status(401).json({ message: "Error reseting password" });
          }
        } else {
          res.status(401).json({ message: "Invalid otp" });
        }
      } else {
        res.status(401).json({ message: "Invalid token" });
      }
    } else {
      res.status(401).json({ message: "Supply all details" });
    }
  } else {
    res
      .status(401)
      .json({ message: "You are not allowed to use this service" });
  }
});

export default { router, path };
