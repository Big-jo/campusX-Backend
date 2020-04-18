import mongoose, {Schema} from 'mongoose';
import {StoreSchema} from './Store.model';
import {IItemModel} from '../interfaces/IItem';
import moment from 'moment';
/**
 *  Merchant is the owner of a store
 */
const ItemSchema: Schema = new Schema({
   name: {type: String, required: true},
   store: {type: Schema.Types.ObjectId, ref: 'Store', required: true},
   date_added: {type: String, required: true, default: moment().format('lll')},
   description: {type: String},
   sales: {type: Number, default: 0},
});

ItemSchema.index('store');

export default mongoose.model<IItemModel>('Item', ItemSchema);
