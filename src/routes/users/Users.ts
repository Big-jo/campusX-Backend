import { logger } from '@shared';
import { Request, Response, Router } from 'express';
import { BAD_REQUEST, CREATED, OK } from 'http-status-codes';
import User from '../../models/User.model';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// Init router and path
const router = Router();
const path = '/users';

/******************************************************************************
 *                                Create New
 ******************************************************************************/

// Constants
export const getUsersPath = '/create';

/**
 * Create a new user and add to DB
 * Full Path: "GET /api/users/create"
 */
router.get(getUsersPath, async (req: Request, res: Response) => {
    try {
        const foundUser = User.findOne({ email: req.body.email});

        if (foundUser) {
            res.json({
                exsist: `Sorry, ${req.body.name} you have an account already, try logging in`
            });
        } else {
            const userProfile: IUserProfile = {
                level: req.body.level,
                university: req.body.university,
                department: req.body.department,
                gender: req.body.gender,
            };
            const user: IUser = new User({
                name: req.body.name.toLowerCase(),
                userTag: req.body.userTag,
                email: req.body.email,
                password: req.body.password,
                phone_number: req.body.number,
                user_profile: userProfile,
            });
            // Hash Password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            user.password = hashedPassword;
            const saved = await user.save();

            // jwt
            const payload = { userID: user._id};
            const secret = process.env.JWT_SECRET as string;
            const token = jwt.sign(payload, secret);

            return res.status(CREATED).json({
                userID: user._id,
                jwt: token,
                success: `${req.body.name} your account has been created, Welcome`,
            });
        }

    } catch (error) {
        logger.error(error, error.message);
    }
    res.send('done').status(200);
});

/******************************************************************************
 *                                Add One
 ******************************************************************************/

// Constants
export const addUserPath = '/add';
export const userMissingErr = 'User property was not present for adding user route.';

/**
 * Add one user.
 * Full Path: "POST /api/users/add"
 */
router.post(addUserPath, async (req: Request, res: Response) => {

});

/******************************************************************************
 *                                      Update
 ******************************************************************************/

// Constants
export const updateUserPath = '/update';
export const userUpdateMissingErr = 'User property was not present for updating user route.';

/**
 * Update one user.
 * Full Path: "PUT /api/users/update"
 */
router.put(updateUserPath, async (req: Request, res: Response) => {

});

/******************************************************************************
 *                                      Delete
 ******************************************************************************/

// Constants
export const deleteUserPath = '/delete/:id';

/**
 * Add one user.
 * Full Path: "DELETE /api/users/delete/:id"
 */
router.delete(deleteUserPath, async (req: Request, res: Response) => {

});

/******************************************************************************
 *                                     Export
 ******************************************************************************/

export default { router, path };
