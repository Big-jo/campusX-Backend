import { Document } from 'mongoose';

export interface IChatMessage {
    senderID: string;
    receiverID: string;
    conversationID: string;
    createdAt: number;
    text?: string;
    video?: string;
    image?: string;
}

export interface IChatMessageModel extends IChatMessage, Document {

}

export interface IConversation {
    sender: string;
    receiver: string;
    lastConversationTimeStamp: number;
    createdAt: number;
    conversation: string;
}

export interface IConversationModel extends IConversation, Document {

}
