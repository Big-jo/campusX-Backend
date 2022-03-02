import mongoose, { Schema, Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate';
import { ICircleConversationModel } from 'src/interfaces/ICircleConversation';

const CircleSchema: Schema = new Schema({
    circle: { type: Schema.Types.ObjectId, ref: 'Circle' },
    active: { type: Number, default: 0 },
    description: { type: String, required: true },
    circlePost: {type: Schema.Types.ObjectId, ref: 'circlePost'},
    moderators: [{type: Schema.Types.ObjectId}],
    limit: { type: Number, default: 20},
    highlight: { type: Boolean, default: false },
}, {timestamps: true});

CircleSchema.plugin(mongoosePaginate);

export default mongoose.model<ICircleConversationModel>('CircleConversation', CircleSchema);
