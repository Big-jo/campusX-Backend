import mongoose,{ Schema } from 'mongoose';
import { ICircleModel } from 'src/interfaces/ICircle';

const ModeratorSchema: Schema = new Schema({
    moderator: {type: Schema.Types.ObjectId, ref: 'User'},
})

const CircleSchema: Schema = new Schema({
    name: {type: String, required: true},
    members_count: {type: String},
    description: {type: String},
    avatar: {type: String},
    moderators: [ModeratorSchema],
});

export default mongoose.model<ICircleModel>('Circle', CircleSchema);