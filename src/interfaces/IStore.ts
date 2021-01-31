import { Document } from 'mongoose';

export interface IStore {
    email: string;
    name: string;
    owner: string;
    description: string;
    password: string;
}

export interface IStoreModel extends IStore, Document {
    date_created: string;
}
