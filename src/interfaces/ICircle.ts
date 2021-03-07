import {Document, PaginateModel} from 'mongoose';

export interface ICircle {
    name: string;
    description: string;
    avatar: any;
    moderators: IModerator[];
    coverImage: string;
    members_count: number;
    category: string;
}

interface IModerator {
    moderator: string;
}

export interface ICircleModel extends ICircle, Document {}

// export interface ICircleModel <T extends Document> extends PaginateModel<T> {}
