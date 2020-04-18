import { IItem } from './IItem';
import { Document } from 'mongoose';

export interface IStoreTransaction {
    store?: string;
    buyerEmail: string;
    buyerName: string;
    itemsPurchased: IItem[];
    Merchat?: string;
    date?: string;
    grandTotal: string;
}

export interface IStoreTransactionModel extends IStoreTransaction, Document {
    
}
