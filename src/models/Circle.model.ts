import mongoose, { Schema, Document } from 'mongoose';
import { ICircle, ICircleModel } from 'src/interfaces/ICircle';
import mongoosePaginate from 'mongoose-paginate';

const ModeratorSchema: Schema = new Schema({
    moderator: { type: Schema.Types.ObjectId, ref: 'User' },
});

const CircleSchema: Schema = new Schema({
    name: { type: String, required: true },
    members_count: { type: Number, default: 0 },
    description: { type: String, required: true },
    avatar: { type: String },
    coverImage: { type: String },
    moderators: [ModeratorSchema],
    category: { type: String, required: true },
    createdAt: {type: String, default: new Date()}

});

CircleSchema.plugin(mongoosePaginate);

export default mongoose.model<ICircleModel>('Circle', CircleSchema);
