import mongoose, { Schema } from 'mongoose';
import {IChatMessageModel} from '../interfaces/IChat';

const ChatMessageSchema: Schema = new Schema({
    sender: {type: Schema.Types.ObjectId, required: true},
    receiver:  {type: Schema.Types.ObjectId, required: true},
    createdAt: {type: Number},
    text: {type: String},
    video: {type: String},
    Image: {type: String},
});

ChatMessageSchema.index({text: 'text'});

export default mongoose.model<IChatMessageModel>('ChatMessage', ChatMessageSchema);
