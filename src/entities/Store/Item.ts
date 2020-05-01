import ItemModel from '../../models/Item.model';
import { logger } from '@shared';
import { IItem } from '../../interfaces/IItem';
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
	public static async AddItems( Options: { multiDoc?: boolean }, itemObject?: IItem, items?: IItem[]) {
		try {
			if (Options.multiDoc) {
				await ItemModel.create(items);
				return 0;
			} else {
				if (itemObject !== undefined) {
					const item = new ItemModel({
						name: itemObject.name,
						store: itemObject.store,
						date_added: moment().format('lll'),
						description: itemObject.description,
						price: itemObject.price,
					});
					await item.save();
					return 0;
				}
			}
		} catch (error) {
			logger.error(error);
			throw new Error(error);
		}
	}

	public static async UpdateItemProperty(itemID: string, field: string, value: string) {
		try {
			await ItemModel.findOneAndUpdate({ _id: itemID }, { [field]: value }).exec();
			return 0;
		} catch (error) {
			logger.error(error);
			throw new Error(error);
		}
	}

	public static async GetItem(itemID: string) {
		try {
			return {item: ItemModel.findById(itemID).exec()};
		} catch (error) {
			logger.error(error);
			throw new Error(error);
		}
	}

	// TODO: Method to verify item price
}
