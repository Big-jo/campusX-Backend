import mongoose, { Schema } from 'mongoose';
import { ItemSchema } from './Item.model';
import moment from 'moment';
import { IStoreTransactionModel } from 'src/interfaces/IStoreTransaction';

const StoreTransactionSchema = new Schema({
    store: {type: Schema.Types.ObjectId, ref: 'Store'},
    buyerEmail: {type: String, required: true},
    buyerName: {type: String, required: true},
    itemsPurchased: [ItemSchema],
    Merchant: {type: Schema.Types.ObjectId, ref: 'Merchant', required: true},
    date: {type: String, default: moment().format('lll')},
    grandTotal: {type: Number, required: true},
    currency: {type: String, required: true},
});

export default mongoose.model<IStoreTransactionModel>('StoreTransaction', StoreTransactionSchema);
