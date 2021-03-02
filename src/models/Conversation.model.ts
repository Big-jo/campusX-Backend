import mongoose, { Schema } from 'mongoose';
import {IConversationModel} from '../interfaces/IChat';

const ChatMessageSchema: Schema = new Schema({
    sender: {type: Schema.Types.ObjectId, required: true},
    receiver:  {type: Schema.Types.ObjectId, required: true},
    lastConversationTimeStamp: {type: Number},
});

ChatMessageSchema.index({text: 'text'});

export default mongoose.model<IConversationModel>('ChatMessage', ChatMessageSchema);
