import mongoose, {Schema, Document, Mongoose} from 'mongoose';
import {StoreSchema} from './Store.model';
import {IItemModel} from '../interfaces/IItem';
/**
 *  Merchant is the owner of a store
 */
const ItemSchema: Schema = new Schema({
   name: {type: String, required: true},
   store: {type: Schema.Types.ObjectId, ref: 'Store', required: true},
   date_added: {type: String, required: true},
   description: {type: String},
   sales: {type: String},
});

export default mongoose.model<IItemModel>('Item', ItemSchema);
