import ItemModel from 'src/models/Item.model';
import { logger } from '@shared';
import { IItem } from 'src/interfaces/IItem';
import moment from 'moment';

export class Item {
    constructor(public itemID: string) { }

    /**
     *
     *
     * @static
     * @param {IItem} itemObject - Object that contains the item's data
     * @param {{singleDoc: boolean; multiDoc: boolean}} Options 
     * @param {IItem[]} [items]
     * @returns {number} 0 if everything goes okay;
     * @memberof Store
     */
    // tslint:disable-next-line: max-line-length
    public static async AddItems(itemObject: IItem, Options: { singleDoc: boolean; multiDoc: boolean }, items?: IItem[]) {
        try {
            if (Options.multiDoc) {
                await ItemModel.create(items);
                return 0;
            } else {
                const item = new ItemModel({
                    name: itemObject.name,
                    store: itemObject.store,
                    date_added: moment().format('lll'),
                    description: itemObject.description,
                });
                await item.save();
                return 0;
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public async UpdateItemProperty(field: string, value: string) {
        try {
            await ItemModel.findOneAndUpdate({ _id: this.itemID }, { [field]: value }).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public async GetItem() {
        try {
            return {item: ItemModel.findById(this.itemID).exec();}
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
}