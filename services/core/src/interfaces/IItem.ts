import { Document } from 'mongoose';

export interface IItem {
    name: string;
    store: string;
    description: string;
    price: string;
    image_url: string;
}

export interface IItemModel extends IItem, Document {
    sales: number;
    date_added: string;
}
