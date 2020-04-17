import { Document } from 'mongoose';

export interface IStore {
    name: string;
    owner: string;
    description: string;
    date_created: string;
}

export interface IStoreModel extends IStore, Document {
    
}
