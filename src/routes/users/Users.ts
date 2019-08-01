import { logger } from '@shared';
import { Request, Response, Router } from 'express';
import { BAD_REQUEST, CREATED, OK, INTERNAL_SERVER_ERROR } from 'http-status-codes';
import User from '../../models/User.model';
import { IUser, IUserProfile } from 'src/interfaces/IUser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User.model';
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
router.post(getUsersPath, async (req: Request, res: Response) => {
    try {
        const foundUser = await User.findOne({ email: req.body.email });
        if (foundUser) {
            res.status(OK).json({
                exsist: `Sorry, ${req.body.name} you have an account already, try logging in`,
            });
        } else {
            const userProfile: IUserProfile = {
                level: req.body.userProfile.level,
                university: req.body.userProfile.university,
                department: req.body.userProfile.department,
                gender: req.body.userProfile.gender,
            };
            const user: IUser = new User({
                name: req.body.name,
                userTag: req.body.userTag,
                email: req.body.email,
                password: req.body.password,
                phone_number: req.body.number,
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
                jwt: token,
                // tslint:disable-next-line: max-line-length
                success: `Your account has been created ${req.body.name.split(' ').slice(0, -1).join(' ')}  Welcome`,
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
                    UserModel.findOneAndUpdate({_id: req.session!.userID}, {$inc: {visits: 1}}).exec();
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
                return  res.status(OK).json({
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

export default {router, path};
