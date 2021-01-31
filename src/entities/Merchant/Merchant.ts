import { logger } from './../../shared/Logger';
import MerchantModel from '../../models/Merchant.model';

export class Merchant {
    
    public static async Create(userID: string) {
        try {
            const merchant = await MerchantModel.findOne({user: userID}).lean().exec();

            if (!merchant) {
                const newMerchant = await new MerchantModel({
                    user: userID,
                }).save();
                return {merchantID: newMerchant._id};
            } else {
                return {exist: true}; 
            }
        } catch (error) {
         logger.error(error);
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
