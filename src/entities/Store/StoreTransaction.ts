import { IStoreTransaction } from 'src/interfaces/IStoreTransaction';
import { IItem } from 'src/interfaces/IItem';
import TransacationModel from 'src/models/Transacation.model';

export class StoreTransaction implements IStoreTransaction {
    public store: string ;
    public buyerEmail: string;
    public buyerName: string;
    public itemsPurchased: IItem[];
    public Merchat: string;
    public grandTotal: number = 0;
    public currency: string;
    
    constructor(store: string, buyerEmail: string, itemsPurchased: IItem[],
                merchant: string, buyerName: string, currency: string) {
        this.store = store;
        this.buyerEmail = buyerEmail;
        this.Merchat =  merchant;
        this.itemsPurchased = itemsPurchased;
        this.buyerName = buyerName;
        this.currency = currency;
    }

    public async CreateTransaction(transacation: IStoreTransaction) {

         const storeTransaction =  new TransacationModel({
             buyerEmail: transacation.buyerEmail,
             store: transacation.store,
             itemsPurchased: transacation.itemsPurchased,
             buyerName: transacation.buyerName,
             Merchant: transacation.Merchant,
             grandTotal: this.CalculateTotal(),
             currency: transacation.currency,
         });
         
    }
    
    private CalculateTotal() {
        let grandTotal = 0;
        this.itemsPurchased.forEach((item) => {
            grandTotal = Number(item.price) + grandTotal;
        });
        return grandTotal;
    }
}
