import jwt from 'jsonwebtoken';

export class Utility {
    constructor() {}

    public static createToken(payload: any) {
        const secret = process.env.JWT_SECRET as string;
        return jwt.sign(payload, secret);
    }
}
