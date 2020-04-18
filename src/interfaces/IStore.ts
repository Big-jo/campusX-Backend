import { Document } from 'mongoose';

export interface IStore {
    email: string;
    name: string;
    owner: string;
    description: string;
    date_created: string;
    password: string;
}

export interface IStoreModel extends IStore, Document {
    
}
