import mongoose from 'mongoose';
import { Store } from '../../entities/Store/Store';
import { IStore } from '../../interfaces/IStore';
import {IItem} from '../../interfaces/IItem';
import chai from 'chai';
import {StoreModel} from '../../models/Store.model';
import {error} from 'winston';
import { Item } from 'src/entities/Store/Item';
const expect = chai.expect;

before(() => {
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
    });
    // Connection Instance
    const Db = mongoose.connection;

// tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));

});

after(() => {
    mongoose.connection.dropCollection('stores').then(r => {
        console.log('Dropped');
    });
});

describe('Store  Related Functions', () => {
    it('should create a store and return a token', done => {
        const store: IStore = {
            description: 'A shoe store',
            email: 'furiousjoe16@gmail.com',
            name: 'Alpha Store',
            owner: '5dda8548843d9d433ed23b4e',
            password: 'Mmedaraetuk16',
        };
        Store.Create('Alpha Store', store).then(result => {
            expect(result.token).to.be.a('string');
            done();
        }).catch(done);
    });

    it('Login (Get a user token) ', done => {
        Store.Login('furiousjoe16@gmail.com', 'Mmedaraetuk16').then(result => {
            expect(result?.token).to.be.a('string');
            done();
        }).catch(done);
    });

    it('Get store catalogue', done => {
        Store.Catalogue('5e9e1cf59137686aa27a3097').then(result => {
            expect(result).to.have.property('items');
            expect(result.items).to.be.an('array');
            done();
        });
    });

    it('Update property of the store', done => {
        Store.Update('5e9e1cf59137686aa27a3097', 'name', 'betaStore').then(result => {
            expect(result).to.equal(0);
            done();
        }).catch(done);
    });

});
