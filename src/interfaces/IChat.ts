import { Document } from 'mongoose';

export interface IChatMessage {
    senderID: string;
    receiverID: string;
    createdAt: string;
    text: string;
    video: string;
    image: string;
}

export interface IChatMessageModel extends IChatMessage, Document {

}

export interface IConversation {
    sender: string;
    receiver: string;
    lastConversationTimeStamp: number;
}

export interface IConversationModel extends IConversation, Document {

}
