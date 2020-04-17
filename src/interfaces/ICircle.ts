import { Document } from 'mongoose';

export interface ICircle {
    name: string;
    members_count: number;
    description: string;
    avatar: string;
    moderators: IModerator[];
}

interface IModerator {
    user: string;
}

export interface ICircleModel extends Document, ICircle {
    
}