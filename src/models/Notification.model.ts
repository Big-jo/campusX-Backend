import mongoose, {Schema} from 'mongoose';
import {IPostModel} from '@interfaces';

const NotificationsSchema: Schema = new Schema({
    userID: {type: Schema.Types.ObjectId, ref: 'User'},
    avatar: {type: String},
    category: {type: String},
    createdAt: {type: Number},
    title: {type: String},
    body: {type: String},
    data: {type: Schema.Types.ObjectId, ref: 'Post'} ,//  would mostly point to another collection
    actor: {type: Schema.Types.ObjectId, ref: 'User'},
}, {
    timestamps: true
});

export default mongoose.model('Notifications', NotificationsSchema);
