import { Document } from 'mongoose';
import { IStore } from './IStore';

export interface IMerchant {
    merchantID: string;
    stores: IStore[];
}

export interface IMerchantModel extends IMerchant, Document {
    
}
