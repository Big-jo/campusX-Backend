"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const http_status_codes_1 = require("http-status-codes");
const validation = {
    validateToken: (req, res, next) => {
        const authorizationHeader = req.headers.authorization;
        let result;
        if (authorizationHeader) {
            const token = authorizationHeader.split(' ')[1];
            try {
                const secret = process.env.JWT_SECRET;
                result = jsonwebtoken_1.default.verify(token, secret);
                req.token = result;
                next();
            }
            catch (error) {
                throw new Error(error);
            }
        }
        else {
            res.status(http_status_codes_1.UNAUTHORIZED).json({
                error: 'Sorry you\'re not authorized to use this endpooint',
            });
        }
    },
};
exports.default = validation;
