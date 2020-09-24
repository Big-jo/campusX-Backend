import {Document, PaginateModel} from 'mongoose';

export interface ICircle extends Document {
    name: string;
    description: string;
    avatar: any;
    moderators: IModerator[];
    members_count: number;
}

interface IModerator {
    moderator: string;
}

export interface ICircleModel <T extends Document> extends PaginateModel<T> {}
