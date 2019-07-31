import { Request } from 'express';

export interface IAuth extends Request {
    decoded?: string | object;
}
