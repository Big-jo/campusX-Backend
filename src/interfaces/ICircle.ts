import { Document } from 'mongoose';

export interface ICircle {
    name: string;
    description: string;
    avatar: any;
}

interface IModerator {
    user: string;
}

export interface ICircleModel extends Document, ICircle {
    moderators: IModerator[];
    members_count: number;
}
