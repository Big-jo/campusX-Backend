import mongoose, {Schema, Document, Mongoose} from 'mongoose';
import {StoreSchema} from './Store.model';
import {IMerchantModel} from '../interfaces/IMerchant';
/**
 *  Merchant is the owner of a store
 */
const MerchantSchema: Schema = new Schema({
   // merchantID: {type: String, required: true},
   user: {type: Schema.Types.ObjectId, ref: 'User'},
   stores: [{type: Schema.Types.ObjectId, ref: 'Store'}],
});

export default mongoose.model<IMerchantModel>('Merchant', MerchantSchema);
