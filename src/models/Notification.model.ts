import mongoose, {Schema} from 'mongoose';
import {IPostModel} from '@interfaces';

const NotificationsSchema: Schema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'User'},
    avatar: {type: String},
    category: {type: String},
    createdAt: {type: Number},
    title: {type: String},
    body: {type: String},
});

export default mongoose.model('Notifications', NotificationsSchema);
