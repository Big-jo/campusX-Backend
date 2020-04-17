import { Document } from 'mongoose';

export interface IMerchant {
    merchantID: string;
    stores: [];
}

export interface IMerchantModel extends IMerchant, Document {
    
}
