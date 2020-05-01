import { IStoreTransaction } from '../../interfaces/IStoreTransaction';
import { IItem } from '../../interfaces/IItem';
import TransacationModel from '../../models/Transacation.model';

export class StoreTransaction implements IStoreTransaction {
	public store: string ;
	public buyerEmail: string;
	public buyerName: string;
	public itemsPurchased: IItem[];
	public Merchant: string;
	public grandTotal: number = 0;
	public currency: string;

	constructor(store: string, buyerEmail: string, itemsPurchased: IItem[],
				         merchant: string, buyerName: string, currency: string) {
		this.store = store;
		this.buyerEmail = buyerEmail;
		this.Merchant =  merchant;
		this.itemsPurchased = itemsPurchased;
		this.buyerName = buyerName;
		this.currency = currency;
	}

	public async CreateTransaction(transaction: IStoreTransaction) {

		 const storeTransaction =  new TransacationModel({
			 buyerEmail: transaction.buyerEmail,
			 store: transaction.store,
			 itemsPurchased: transaction.itemsPurchased,
			 buyerName: transaction.buyerName,
			 Merchant: transaction.Merchant,
			 grandTotal: this.CalculateTotal(),
			 currency: transaction.currency,
		 });

	}

	private CalculateTotal() {
		let grandTotal = 0;
		this.itemsPurchased.forEach(item => {
			grandTotal = Number(item.price) + grandTotal;
		});
		return grandTotal;
	}

	public Payment() {

	}
}
