import { StoreModel } from 'src/models/Store.model';
import { IStore } from 'src/interfaces/IStore';
import moment from 'moment';
import { Utility } from 'src/lib/utility';
import { logger } from '@shared';
import bcrypt from 'bcrypt';
import ItemModel from 'src/models/Item.model';
import { IItem } from 'src/interfaces/IItem';

export class Store {
    constructor() { }

    /**
     * Create
     */
    public static async Create(storeID: string, storeObject: IStore) {
        try {
            const store = await StoreModel.findById(storeID) !== null;
            if (store) {
                return { exist: true };
            } else {
                const newStore = new StoreModel({
                    name: storeObject.name,
                    owner: storeObject.owner,
                    description: storeObject.description,
                    date_created: moment().format('lll'),
                    password: storeObject.password,
                    email: storeObject.email,
                });
                const rounds = await bcrypt.genSalt(10);
                newStore.password = await bcrypt.hash(newStore.password, rounds);
                await newStore.save();
                const payload = {
                    storeID: newStore._id,
                    name: newStore.name,
                    email: newStore.email,
                };
                return { token: Utility.createToken(payload) };
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Login(email: string, password: string) {
        try {
            const store = await StoreModel.findOne({ email }).exec();
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
                    return Utility.createToken(payload);
                } else {
                    return { badRequest: 'email or password is not correct' };
                }
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async Catalogue(storeID: string) {
        try {
            const items = await ItemModel.find({store: storeID}).exec();
            return {items};
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
}
