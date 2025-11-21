import mongoose, { Schema } from 'mongoose';
import {IChatMessageModel} from '../interfaces/IChat';

const ChatMessageSchema: Schema = new Schema({
    sender: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    receiver:  {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    createdAt: {type: Number},
    text: {type: String},
    video: {type: String},
    Image: {type: String},
    conversation: {type: Schema.Types.ObjectId, required: true, ref: 'Conversation'},
});

ChatMessageSchema.index({text: 'text'});

export default mongoose.model<IChatMessageModel>('ChatMessage', ChatMessageSchema);
