import { Document } from 'mongoose';
import { IStore } from './IStore';

export interface IMerchant {
    merchantID: string;
}

export interface IMerchantModel extends IMerchant, Document {
    stores: IStore[];
    user: string;
}
