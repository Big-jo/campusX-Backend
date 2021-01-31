import mongoose, { Schema } from 'mongoose';
import { ICircle } from 'src/interfaces/ICircle';
import mongoosePaginate from 'mongoose-paginate';
const ModeratorSchema: Schema = new Schema({
    moderator: { type: Schema.Types.ObjectId, ref: 'User' },
});

const CircleSchema: Schema = new Schema({
    name: { type: String, required: true },
    members_count: { type: Number, default: 0 },
    description: { type: String, required: true },
    avatar: { type: String },
    moderators: [ModeratorSchema],
});

CircleSchema.plugin(mongoosePaginate);

export default mongoose.model<ICircle>('Circle', CircleSchema);
