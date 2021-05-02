import mongoose, { Schema } from 'mongoose';
import {IConversationModel} from '../interfaces/IChat';

const ConversationSchema: Schema = new Schema({
    sender: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    receiver:  {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    lastConversationTimeStamp: {type: Number},
});

ConversationSchema.index({text: 'text'});

export default mongoose.model<IConversationModel>('Conversation', ConversationSchema);
