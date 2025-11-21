import {Document, PaginateModel} from 'mongoose';

export interface ICircleConversation {
    limit: number;
    circle: string;
    circlePost: string;
    active: number;
    description: string;
    moderator: string[];
    highlight: boolean;
}

interface IModerator {
    moderator: string;
}

export interface ICircleConversationModel extends ICircleConversation, Document {}

// export interface ICircleModel <T extends Document> extends PaginateModel<T> {}
