import { IItem } from './IItem';
import { Document } from 'mongoose';

export interface IStoreTransaction {
    store?: string;
    buyerEmail: string;
    buyerName: string;
    itemsPurchased: IItem[];
    Merchant: string;
    date?: string;
    grandTotal: number;
    currency: string;
}

export interface IStoreTransactionModel extends IStoreTransaction, Document {

}
