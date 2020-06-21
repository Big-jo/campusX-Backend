import { StoreModel } from '../../models/Store.model';
import { IStore } from '../../interfaces/IStore';
import moment from 'moment';
import { Utility } from '../../lib/utility';
import { logger } from '../../shared/Logger';
import bcrypt from 'bcrypt';
import ItemModel from '../../models/Item.model';
import {IItem, IItemModel} from '../../interfaces/IItem';
import {throws} from 'assert';
import {StoreTransaction} from './StoreTransaction';
import {IStoreTransaction} from '../../interfaces/IStoreTransaction';
import MerchantModel from '../../models/Merchant.model';

export class Store {
    // constructor() { }

    /******************************************************************************
    *                                 CREATE A STORE
    /******************************************************************************/
    public static async Create(name: string, storeObject: IStore) {
        try {
            const store = await StoreModel.findOne({name: storeObject.name.toLowerCase()}) !== null;
            if (store) {
                return { exist: true };
            } else {
                const newStore = new StoreModel({
                    name: storeObject.name.toLowerCase(),
                    owner: storeObject.owner,
                    description: storeObject.description,
                    date_created: moment().format('lll'),
                    password: storeObject.password,
                    email: storeObject.email,
                });
                const rounds = await bcrypt.genSalt(10);
                newStore.password = await bcrypt.hash(newStore.password, rounds);
                await newStore.save();

                await MerchantModel.findByIdAndUpdate(newStore.owner, {$push: newStore._id}).exec();

                const payload = {
                    storeID: newStore._id,
                    name: newStore.name,
                    email: newStore.email,
                    owner: newStore.owner,
                };
                
                return { token: Utility.createToken(payload) };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
    /******************************************************************************
    *                                 LOGIN TO A STORE
    /******************************************************************************/
    public static async Login(storeName: string, password: string) {
        try {
            const store = await StoreModel.findOne({name: storeName.toLowerCase()}).exec();
            if (store) {
                const payload = {
                    storeID: store._id,
                    name: store.name,
                    email: store.email,
                };
                const storePassword = store.password;
                // tslint:disable-next-line: whitespace
                const result = await bcrypt.compare(password, storePassword);
                if (result) {
                    return {token: Utility.createToken(payload)};
                } else {
                    return { badRequest: 'email or password is not correct' };
                }
            } else {
                return {exist: false};
            }
        } catch (error) {
            logger.error(error.message);
            throw new Error(error);
        }
    }

    /******************************************************************************
    *                                 GET ITEMS IN A STORE
    /******************************************************************************/
    public static async Catalogue(storeID: string) {
        try {
            const items = await ItemModel.find({store: storeID}).exec();
            return {items};
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    // TODO: Add store settings such as ads,
    // TODO: Payment

    public static async Update(storeID: string, field: string, update: any) {
        try {
            await StoreModel.findByIdAndUpdate(storeID, {[field]: update}).exec();
            return 0;
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    /***
     *
     * @param items - Items to be sold
     * @param storeID - ID of store to be gotten from
     * @param transDetails
     * @constructor
     */
    public static async Purchase(items: IItemModel[], storeID: string,  transDetails: IStoreTransaction) {
        try {
            const transaction = new StoreTransaction(storeID, transDetails.buyerEmail,
                items, transDetails.Merchant, transDetails.buyerName, transDetails.currency);

            transaction.Payment();
        } catch (e) {

        }
    }

    private static async ValidateItems(items: IItemModel[]) {
        const itemIDs = items.map(item => {
            return item._id;
        });

        const foundItems = await ItemModel.find({_id: {$in: itemIDs}}).exec();
        for (const item of foundItems) {
            for (const item2 of items) {
                if (item.price !== item2.price) {
                    return {error: 'prices are not the same'};
                }
            }
        }
        return {valid: true};
    }
}
