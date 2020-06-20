import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import {server} from '@server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';
import {expect} from 'chai';
import {IItem} from '../../interfaces/IItem';

const BaseApi = '/api/v1/store';
const storeID = '5ecff5ea631385c8389443b1';

let agent: SuperTest<Test>;
agent = supertest.agent(server);

before(done => {
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
    });
    const Db = mongoose.connection;
    // tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
    // tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));
    done();
});

after(done => {
    mongoose.disconnect();
    done();
});

describe('create store', () => {
    it('should create a store 201', done => {
        agent.post(`${BaseApi}/create`)
            .send({
                storeObject: {
                    name: 'Dragon',
                    owner: '5eed10405aa3aa7e74f275ef',
                    description: 'Well this is a store',
                    password: 'store1',
                    email: 'doe@gmail.com',
                },
            })
            .end((err: Error, res: Response) => {
                console.log(res.body);
                expect(res.status).to.equal(CREATED);
                expect(res.body.token).to.be.a('string');
                done();
            });
    });
});

describe('login into store', () => {
    it('should return 200', done => {
        agent.post(`${BaseApi}/login`).send({
            name: 'Dragon Age',
            password: 'store1',
        }).end((err, res) => {
            expect(res.status).to.equal(OK);
            expect(res.body.token).to.be.a('string');
            done();
        });
    });
});

describe('Get store catalogue', () => {
    it('should return 200 and catalogue array', done => {
        agent.get(`${BaseApi}/catalogue/5eed10845aa3aa7e74f275f0`).end((err, res) => {
            expect(res.status).to.equal(200);
            console.log(res.body)
            expect(res.body.catalogue).to.be.an('array');
            done();
        });
    });
});

describe('Add Item to Store', () => {
    const itemsObject: IItem = {
        description: 'It is a shoe',
        image_url: 'randome',
        name: 'Nike Air Max',
        price: '42000',
        store: storeID,
    };
    const options = {
        multiDoc: false
    };

    it('should add a single item to store', done => {
        agent.post(`${BaseApi}/addItem`).send({itemsObject, options}).end((err, res) => {
            expect(res.status).to.equal(CREATED);
            done();
        });
    });

    const itemsObject2: IItem[] =
        [{
            description: 'Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.\n\nIn quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/163x182.png/5fa2dd/ffffff',
            name: 'Ambrosia artemisiaefolia, Anacardium orientale, Baryta muriatica, Calcarea carbonica, Calcarea phosphorica, Fucus Vesiculosus, Helleborus niger, Hypothalamus, Ignatia amara, Lycopodium clavatum, Magnesia phosphorica, Manganum metallicum, Nicotinamidum, Phosphorus, Secale Cornutum, Silicea, Solidago virgaurea, Thymus serpyllum, Thyroidinum',
            price: 9794,
        }, {
            description: 'Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/152x181.png/ff4444/ffffff',
            name: 'LIDOCAINE HYDROCHLORIDE',
            price: 47175,
        }, {
            description: 'Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/235x238.bmp/5fa2dd/ffffff',
            name: 'HYDROGEN PEROXIDE',
            price: 28544,
        }, {
            description: 'Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.\n\nFusce consequat. Nulla nisl. Nunc nisl.\n\nDuis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/217x162.png/cc0000/ffffff',
            name: 'Diltiazem Hydrochloride',
            price: 32963,
        }, {
            description: 'Suspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/119x167.bmp/dddddd/000000',
            name: 'Baclofen',
            price: 22819,
        }, {
            description: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/122x139.bmp/dddddd/000000',
            name: 'OCTINOXATE',
            price: 521,
        }, {
            description: 'Duis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/134x244.bmp/5fa2dd/ffffff',
            name: 'Avobenzone, Octisalate and Octocrylene',
            price: 13469,
        }, {
            description: 'Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/186x160.bmp/5fa2dd/ffffff',
            name: 'Bryonia , Cocculus, Gelsemium, Lobelia inf, Acacia gum, lactose, magnesium stearate, corn starch, sucrose',
            price: 44806,
        }, {
            description: 'Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/238x179.png/5fa2dd/ffffff',
            name: 'OXYCODONE HYDROCHLORIDE',
            price: 9730,
        }, {
            description: 'Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.\n\nPraesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/235x213.png/dddddd/000000',
            name: 'Annual Blue Grass',
            price: 1250,
        }, {
            description: 'In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/209x247.jpg/ff4444/ffffff',
            name: 'amphotericin B',
            price: 38600,
        }, {
            description: 'In hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.\n\nAliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/100x122.png/5fa2dd/ffffff',
            name: 'Salicylic Acid',
            price: 36782,
        }, {
            description: 'Aenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.\n\nQuisque id justo sit amet sapien dignissim vestibulum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Nulla dapibus dolor vel est. Donec odio justo, sollicitudin ut, suscipit a, feugiat et, eros.\n\nVestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/194x176.bmp/dddddd/000000',
            name: 'Atenolol',
            price: 4232,
        }, {
            description: 'Mauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/135x207.png/5fa2dd/ffffff',
            name: 'Arsenicum album, Hepar sulphuris calcareum, Kali bichromicum, Lycopodium clavatum, Mercurius solubilis, Natrum muriaticum, Phosphorus, Pulsatilla, Sepia,',
            price: 34456,
        }, {
            description: 'Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/170x106.png/ff4444/ffffff',
            name: 'DIMETHICONE',
            price: 5975,
        }, {
            description: 'Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.\n\nDonec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/242x119.bmp/ff4444/ffffff',
            name: 'Diltiazem Hydrochloride',
            price: 13741,
        }, {
            description: 'Phasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/175x191.jpg/dddddd/000000',
            name: 'Salix Vitellina',
            price: 43982,
        }, {
            description: 'Aenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.\n\nCurabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.\n\nPhasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.',
            store: '5e9e1cf59137686aa27a3097',
            image_url: 'http://dummyimage.com/134x248.jpg/cc0000/ffffff',
            name: 'Body Fluid Balance',
            price: 14218,
        }];
    const options2 = {
        multiDoc: true,
    };
    it('should add multiple items to store', done => {
        agent.post(`${BaseApi}/addItem`).send({itemsObject: itemsObject2, options: options2}).end((err, res) => {
            expect(res.status).to.equal(CREATED);
            done();
        });
    });
})
