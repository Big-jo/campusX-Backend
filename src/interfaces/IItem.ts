import { Document } from 'mongoose';

export interface IItem {
    name: string;
    store: string;
    date_added: string;
    description: string;
    sales: string;
}

export interface IItemModel extends IItem, Document {
    
}
