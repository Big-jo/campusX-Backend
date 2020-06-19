import { IMerchant } from 'src/interfaces/IMerchant';
import MerchantModel from 'src/models/Merchant.model';

export class Merchant {
    
    public static async Create(merchantObject: IMerchant) {
        try {
            const merchant = await MerchantModel.findOne(merchantObject.merchantID).lean().exec();

            if (!merchant) {
                const newMerchant = await new MerchantModel(merchantObject).save();
                return {merchantID: newMerchant._id};
            } else {
                return {exist: true}; 
            }
        } catch (error) {
         throw new Error(error);
        }
    }

    public static async GetStores(merchantID: string) {
        try {
            const stores = await MerchantModel.findById(merchantID, {stores: 1})
                .populate('Store').exec();
            return {stores};
        } catch (error) {
            throw new Error(error);
        }
    }
}
