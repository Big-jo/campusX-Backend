import mongoose, {Schema, Document} from 'mongoose';
import { IStoreModel } from 'src/interfaces/IStore';

export const StoreSchema: Schema = new Schema({
    name: {type: String, required: true},
    owner: {type: Schema.Types.ObjectId, ref: 'Merchant'},
    description: {type: String},
    date_created: {type: String},
    password: {type: String},
    email: {type: String},
});

export const StoreModel = mongoose.model<IStoreModel>('Store', StoreSchema);
