import mongoose from 'mongoose';
import {IItem} from '../../interfaces/IItem';
import chai from 'chai';

const expect = chai.expect;

before(() => {
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
    });
    // Connection Instance
    const Db = mongoose.connection;
// tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));
});

describe('Item Functions', () => {
    it('Add items to a store using a signle doc', (done) => {
        const itemsObject: IItem = {
            description: 'It is a shoe',
            image_url: 'randome',
            name: 'Nike Air Max',
            price: '42000',
            store: '5e9e1cf59137686aa27a3097',
        };

        Item.AddItems({multiDoc: false}, itemsObject).then((result) => {
            expect(result).to.be.a('number');
            expect(result).to.equal(0);
            done();
        }).catch(done);
    });

    it('Add items to a store using multi-doc option', (done) => {
        const itemsObject: IItem[] = [{
            "description": "Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.\n\nIn quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/163x182.png/5fa2dd/ffffff",
            "name": "Ambrosia artemisiaefolia, Anacardium orientale, Baryta muriatica, Calcarea carbonica, Calcarea phosphorica, Fucus Vesiculosus, Helleborus niger, Hypothalamus, Ignatia amara, Lycopodium clavatum, Magnesia phosphorica, Manganum metallicum, Nicotinamidum, Phosphorus, Secale Cornutum, Silicea, Solidago virgaurea, Thymus serpyllum, Thyroidinum",
            "price": 9794
          }, {
            "description": "Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.",
            "image_url": "http://dummyimage.com/152x181.png/ff4444/ffffff",
            "name": "LIDOCAINE HYDROCHLORIDE",
            "price": 47175
          }, {
            "description": "Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.",
            "image_url": "http://dummyimage.com/235x238.bmp/5fa2dd/ffffff",
            "name": "HYDROGEN PEROXIDE",
            "price": 28544
          }, {
            "description": "Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.\n\nFusce consequat. Nulla nisl. Nunc nisl.\n\nDuis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.",
            "image_url": "http://dummyimage.com/217x162.png/cc0000/ffffff",
            "name": "Diltiazem Hydrochloride",
            "price": 32963
          }, {
            "description": "Suspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.",
            "image_url": "http://dummyimage.com/119x167.bmp/dddddd/000000",
            "name": "Baclofen",
            "price": 22819
          }, {
            "description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.",
            "image_url": "http://dummyimage.com/122x139.bmp/dddddd/000000",
            "name": "OCTINOXATE",
            "price": 521
          }, {
            "description": "Duis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.",
            "image_url": "http://dummyimage.com/134x244.bmp/5fa2dd/ffffff",
            "name": "Avobenzone, Octisalate and Octocrylene",
            "price": 13469
          }, {
            "description": "Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
            "image_url": "http://dummyimage.com/186x160.bmp/5fa2dd/ffffff",
            "name": "Bryonia , Cocculus, Gelsemium, Lobelia inf, Acacia gum, lactose, magnesium stearate, corn starch, sucrose",
            "price": 44806
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/238x179.png/5fa2dd/ffffff",
            "name": "OXYCODONE HYDROCHLORIDE",
            "price": 9730
          }, {
            "description": "Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.\n\nPraesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.",
            "image_url": "http://dummyimage.com/235x213.png/dddddd/000000",
            "name": "Annual Blue Grass",
            "price": 1250
          }, {
            "description": "In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.",
            "image_url": "http://dummyimage.com/209x247.jpg/ff4444/ffffff",
            "name": "amphotericin B",
            "price": 38600
          }, {
            "description": "In hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.\n\nAliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.",
            "image_url": "http://dummyimage.com/100x122.png/5fa2dd/ffffff",
            "name": "Salicylic Acid",
            "price": 36782
          }, {
            "description": "Aenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.\n\nQuisque id justo sit amet sapien dignissim vestibulum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Nulla dapibus dolor vel est. Donec odio justo, sollicitudin ut, suscipit a, feugiat et, eros.\n\nVestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.",
            "image_url": "http://dummyimage.com/194x176.bmp/dddddd/000000",
            "name": "Atenolol",
            "price": 4232
          }, {
            "description": "Mauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.",
            "image_url": "http://dummyimage.com/135x207.png/5fa2dd/ffffff",
            "name": "Arsenicum album, Hepar sulphuris calcareum, Kali bichromicum, Lycopodium clavatum, Mercurius solubilis, Natrum muriaticum, Phosphorus, Pulsatilla, Sepia,",
            "price": 34456
          }, {
            "description": "Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.",
            "image_url": "http://dummyimage.com/170x106.png/ff4444/ffffff",
            "name": "DIMETHICONE",
            "price": 5975
          }, {
            "description": "Duis aliquam convallis nunc. Proin at turpis a pede posuere nonummy. Integer non velit.\n\nDonec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.",
            "image_url": "http://dummyimage.com/242x119.bmp/ff4444/ffffff",
            "name": "Diltiazem Hydrochloride",
            "price": 13741
          }, {
            "description": "Phasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.",
            "image_url": "http://dummyimage.com/175x191.jpg/dddddd/000000",
            "name": "Salix Vitellina",
            "price": 43982
          }, {
            "description": "Aenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.\n\nCurabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.\n\nPhasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.",
            "image_url": "http://dummyimage.com/134x248.jpg/cc0000/ffffff",
            "name": "Body Fluid Balance",
            "price": 14218
          }, {
            "description": "Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.\n\nEtiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.",
            "image_url": "http://dummyimage.com/163x180.bmp/5fa2dd/ffffff",
            "name": "IRBESARTAN AND HYDROCHLOROTHIAZIDE",
            "price": 36308
          }, {
            "description": "Aenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.",
            "image_url": "http://dummyimage.com/214x226.bmp/cc0000/ffffff",
            "name": "Benzocain",
            "price": 30449
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/248x114.png/cc0000/ffffff",
            "name": "Treatment Set TS349186",
            "price": 20743
          }, {
            "description": "Proin interdum mauris non ligula pellentesque ultrices. Phasellus id sapien in sapien iaculis congue. Vivamus metus arcu, adipiscing molestie, hendrerit at, vulputate vitae, nisl.\n\nAenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.",
            "image_url": "http://dummyimage.com/198x198.png/cc0000/ffffff",
            "name": "Pancrelipase",
            "price": 48483
          }, {
            "description": "Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.\n\nDuis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.",
            "image_url": "http://dummyimage.com/141x128.bmp/ff4444/ffffff",
            "name": "Diltiazem Hydrochloride",
            "price": 8579
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/139x197.jpg/ff4444/ffffff",
            "name": "ETHYL ALCOHOL",
            "price": 37392
          }, {
            "description": "Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.",
            "image_url": "http://dummyimage.com/190x154.jpg/ff4444/ffffff",
            "name": "VANCOMYCIN HYDROCHLORIDE",
            "price": 33355
          }, {
            "description": "Maecenas ut massa quis augue luctus tincidunt. Nulla mollis molestie lorem. Quisque ut erat.\n\nCurabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/124x197.png/5fa2dd/ffffff",
            "name": "Acetaminophen",
            "price": 29804
          }, {
            "description": "Nulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.",
            "image_url": "http://dummyimage.com/204x215.png/ff4444/ffffff",
            "name": "Amoxicillin and Clavulanate Potassium",
            "price": 33162
          }, {
            "description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.\n\nVestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.",
            "image_url": "http://dummyimage.com/112x236.bmp/cc0000/ffffff",
            "name": "oxycodone hydrochloride",
            "price": 13958
          }, {
            "description": "Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.",
            "image_url": "http://dummyimage.com/132x134.bmp/dddddd/000000",
            "name": "miconazole nitrate",
            "price": 4585
          }, {
            "description": "In quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.\n\nMaecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.",
            "image_url": "http://dummyimage.com/183x232.bmp/cc0000/ffffff",
            "name": "Cedar Red",
            "price": 29706
          }, {
            "description": "Nullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.\n\nMorbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.",
            "image_url": "http://dummyimage.com/146x205.jpg/cc0000/ffffff",
            "name": "Diphenhydramine Hydrochloride",
            "price": 36835
          }, {
            "description": "Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.\n\nSed ante. Vivamus tortor. Duis mattis egestas metus.",
            "image_url": "http://dummyimage.com/189x186.jpg/cc0000/ffffff",
            "name": "Bismuth Subsalicylate",
            "price": 36319
          }, {
            "description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.\n\nVestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.",
            "image_url": "http://dummyimage.com/236x152.jpg/cc0000/ffffff",
            "name": "Simvastatin",
            "price": 27519
          }, {
            "description": "Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.",
            "image_url": "http://dummyimage.com/128x157.bmp/ff4444/ffffff",
            "name": "Octinoxate and Oxybenzone",
            "price": 43413
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/175x216.bmp/ff4444/ffffff",
            "name": "Bisacodyl",
            "price": 4987
          }, {
            "description": "Proin eu mi. Nulla ac enim. In tempor, turpis nec euismod scelerisque, quam turpis adipiscing lorem, vitae mattis nibh ligula nec sem.",
            "image_url": "http://dummyimage.com/199x104.jpg/ff4444/ffffff",
            "name": "Cefoxitin",
            "price": 18926
          }, {
            "description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.\n\nVestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.\n\nDuis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.",
            "image_url": "http://dummyimage.com/207x112.png/cc0000/ffffff",
            "name": "MOMORDICA CHARANTIA FRUIT",
            "price": 34241
          }, {
            "description": "Duis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.\n\nIn hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.",
            "image_url": "http://dummyimage.com/157x194.png/5fa2dd/ffffff",
            "name": "Metoclopramide",
            "price": 43686
          }, {
            "description": "Sed ante. Vivamus tortor. Duis mattis egestas metus.\n\nAenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.\n\nQuisque id justo sit amet sapien dignissim vestibulum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Nulla dapibus dolor vel est. Donec odio justo, sollicitudin ut, suscipit a, feugiat et, eros.",
            "image_url": "http://dummyimage.com/193x129.bmp/ff4444/ffffff",
            "name": "Yeast, Baker Saccharomyces cerevisiae",
            "price": 37072
          }, {
            "description": "Fusce consequat. Nulla nisl. Nunc nisl.\n\nDuis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.",
            "image_url": "http://dummyimage.com/223x185.jpg/5fa2dd/ffffff",
            "name": "Trazodone Hydrochloride",
            "price": 17647
          }, {
            "description": "Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.\n\nIn quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/177x250.png/dddddd/000000",
            "name": "ALLANTOIN",
            "price": 6820
          }, {
            "description": "Quisque id justo sit amet sapien dignissim vestibulum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Nulla dapibus dolor vel est. Donec odio justo, sollicitudin ut, suscipit a, feugiat et, eros.\n\nVestibulum ac est lacinia nisi venenatis tristique. Fusce congue, diam id ornare imperdiet, sapien urna pretium nisl, ut volutpat sapien arcu sed augue. Aliquam erat volutpat.",
            "image_url": "http://dummyimage.com/250x215.bmp/ff4444/ffffff",
            "name": "Antifungal Powder Miconazole Nitrate",
            "price": 12753
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/167x166.bmp/cc0000/ffffff",
            "name": "EUCALYPTOL, MENTHOL, METHYL SALICYLATE, THYMOL",
            "price": 24071
          }, {
            "description": "In sagittis dui vel nisl. Duis ac nibh. Fusce lacus purus, aliquet at, feugiat non, pretium quis, lectus.\n\nSuspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.",
            "image_url": "http://dummyimage.com/223x185.png/ff4444/ffffff",
            "name": "TRICLOSAN",
            "price": 28209
          }, {
            "description": "Nullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.",
            "image_url": "http://dummyimage.com/234x101.bmp/cc0000/ffffff",
            "name": "Gentamicin Sulfate",
            "price": 21078
          }, {
            "description": "Etiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.\n\nPraesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.\n\nCras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.",
            "image_url": "http://dummyimage.com/234x208.jpg/dddddd/000000",
            "name": "Tropicamide",
            "price": 18848
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/244x230.png/dddddd/000000",
            "name": "Johnson Grass",
            "price": 10204
          }, {
            "description": "Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.",
            "image_url": "http://dummyimage.com/151x238.bmp/5fa2dd/ffffff",
            "name": "treprostinil",
            "price": 34627
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/127x129.bmp/ff4444/ffffff",
            "name": "Avobenzone and Octocrylene and Oxybenzone",
            "price": 25257
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.\n\nMaecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.",
            "image_url": "http://dummyimage.com/229x243.png/ff4444/ffffff",
            "name": "ACETAMINOPHEN, DEXTROMETHORPHAN, PHENYLEPHRINE",
            "price": 45201
          }, {
            "description": "Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.\n\nFusce consequat. Nulla nisl. Nunc nisl.\n\nDuis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.",
            "image_url": "http://dummyimage.com/213x211.png/cc0000/ffffff",
            "name": "mecasermin",
            "price": 40612
          }, {
            "description": "Quisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.",
            "image_url": "http://dummyimage.com/182x120.bmp/ff4444/ffffff",
            "name": "Lombardy Poplar",
            "price": 48912
          }, {
            "description": "Aenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.\n\nCurabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.\n\nPhasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.",
            "image_url": "http://dummyimage.com/141x190.jpg/cc0000/ffffff",
            "name": "Cetirizine Hydrochloride",
            "price": 13137
          }, {
            "description": "Integer tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.\n\nPraesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.\n\nMorbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.",
            "image_url": "http://dummyimage.com/108x111.jpg/dddddd/000000",
            "name": "Levofloxacin",
            "price": 36795
          }, {
            "description": "Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.\n\nQuisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.",
            "image_url": "http://dummyimage.com/142x249.png/5fa2dd/ffffff",
            "name": "HYDROCODONE BITARTRATE AND ACETAMINOPHEN",
            "price": 18119
          }, {
            "description": "Suspendisse potenti. In eleifend quam a odio. In hac habitasse platea dictumst.\n\nMaecenas ut massa quis augue luctus tincidunt. Nulla mollis molestie lorem. Quisque ut erat.",
            "image_url": "http://dummyimage.com/217x129.png/ff4444/ffffff",
            "name": "NAJA NAJA VENOM",
            "price": 15978
          }, {
            "description": "In sagittis dui vel nisl. Duis ac nibh. Fusce lacus purus, aliquet at, feugiat non, pretium quis, lectus.",
            "image_url": "http://dummyimage.com/174x151.png/dddddd/000000",
            "name": "Dill",
            "price": 27482
          }, {
            "description": "In congue. Etiam justo. Etiam pretium iaculis justo.\n\nIn hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.",
            "image_url": "http://dummyimage.com/140x196.bmp/5fa2dd/ffffff",
            "name": "CORN SMUT",
            "price": 3612
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.\n\nMaecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.\n\nNullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.",
            "image_url": "http://dummyimage.com/100x129.jpg/ff4444/ffffff",
            "name": "Aluminum Chlorohydrate",
            "price": 3401
          }, {
            "description": "Praesent id massa id nisl venenatis lacinia. Aenean sit amet justo. Morbi ut odio.\n\nCras mi pede, malesuada in, imperdiet et, commodo vulputate, justo. In blandit ultrices enim. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.",
            "image_url": "http://dummyimage.com/167x120.bmp/ff4444/ffffff",
            "name": "Fluoxetine",
            "price": 4756
          }, {
            "description": "Donec diam neque, vestibulum eget, vulputate ut, ultrices vel, augue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Donec pharetra, magna vestibulum aliquet ultrices, erat tortor sollicitudin mi, sit amet lobortis sapien sapien non mi. Integer ac neque.\n\nDuis bibendum. Morbi non quam nec dui luctus rutrum. Nulla tellus.\n\nIn sagittis dui vel nisl. Duis ac nibh. Fusce lacus purus, aliquet at, feugiat non, pretium quis, lectus.",
            "image_url": "http://dummyimage.com/206x179.bmp/dddddd/000000",
            "name": "olmesartan medoxomil / amlodipine besylate / hydrochlorothiazide",
            "price": 1430
          }, {
            "description": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Proin risus. Praesent lectus.",
            "image_url": "http://dummyimage.com/242x234.jpg/dddddd/000000",
            "name": "Clotrimazole",
            "price": 3395
          }, {
            "description": "In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.\n\nCras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.",
            "image_url": "http://dummyimage.com/202x140.png/ff4444/ffffff",
            "name": "Losartan Potassium",
            "price": 42668
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.",
            "image_url": "http://dummyimage.com/128x219.bmp/cc0000/ffffff",
            "name": "Tree Mix 6",
            "price": 44534
          }, {
            "description": "Praesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.",
            "image_url": "http://dummyimage.com/217x223.jpg/ff4444/ffffff",
            "name": "TITANIUM DIOXIDE",
            "price": 22578
          }, {
            "description": "Morbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.\n\nFusce posuere felis sed lacus. Morbi sem mauris, laoreet ut, rhoncus aliquet, pulvinar sed, nisl. Nunc rhoncus dui vel sem.",
            "image_url": "http://dummyimage.com/249x246.bmp/cc0000/ffffff",
            "name": "SEPIA OFFICINALIS JUICE",
            "price": 42027
          }, {
            "description": "Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.\n\nEtiam vel augue. Vestibulum rutrum rutrum neque. Aenean auctor gravida sem.",
            "image_url": "http://dummyimage.com/101x145.bmp/ff4444/ffffff",
            "name": "Glipizide and Metformin HCl",
            "price": 8346
          }, {
            "description": "Morbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.",
            "image_url": "http://dummyimage.com/203x187.png/dddddd/000000",
            "name": "scallop",
            "price": 32326
          }, {
            "description": "Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.",
            "image_url": "http://dummyimage.com/153x138.png/ff4444/ffffff",
            "name": "Eastern Cottonwood Common",
            "price": 18240
          }, {
            "description": "Praesent blandit. Nam nulla. Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.\n\nMorbi porttitor lorem id ligula. Suspendisse ornare consequat lectus. In est risus, auctor sed, tristique in, tempus sit amet, sem.\n\nFusce consequat. Nulla nisl. Nunc nisl.",
            "image_url": "http://dummyimage.com/174x166.png/cc0000/ffffff",
            "name": "Benztropine Mesylate",
            "price": 10474
          }, {
            "description": "Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.",
            "image_url": "http://dummyimage.com/200x125.bmp/dddddd/000000",
            "name": "Couch Quack Grass",
            "price": 41059
          }, {
            "description": "Phasellus in felis. Donec semper sapien a libero. Nam dui.\n\nProin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.",
            "image_url": "http://dummyimage.com/135x222.jpg/ff4444/ffffff",
            "name": "Ibuprofen",
            "price": 17272
          }, {
            "description": "Sed ante. Vivamus tortor. Duis mattis egestas metus.",
            "image_url": "http://dummyimage.com/113x165.jpg/ff4444/ffffff",
            "name": "OCTINOXATE, TITANIUM DIOXIDE, ZINC OXIDE",
            "price": 40018
          }, {
            "description": "Duis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.",
            "image_url": "http://dummyimage.com/110x234.bmp/cc0000/ffffff",
            "name": "imipramine hydrochloride",
            "price": 40616
          }, {
            "description": "Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.\n\nDuis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.",
            "image_url": "http://dummyimage.com/139x196.jpg/cc0000/ffffff",
            "name": "Benzalkonium Chloride",
            "price": 43404
          }, {
            "description": "Vestibulum quam sapien, varius ut, blandit non, interdum in, ante. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Duis faucibus accumsan odio. Curabitur convallis.\n\nDuis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.",
            "image_url": "http://dummyimage.com/202x231.bmp/dddddd/000000",
            "name": "Sertraline Hydrochloride",
            "price": 13810
          }, {
            "description": "Maecenas tristique, est et tempus semper, est quam pharetra magna, ac consequat metus sapien ut nunc. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Mauris viverra diam vitae quam. Suspendisse potenti.\n\nNullam porttitor lacus at turpis. Donec posuere metus vitae ipsum. Aliquam non mauris.\n\nMorbi non lectus. Aliquam sit amet diam in magna bibendum imperdiet. Nullam orci pede, venenatis non, sodales sed, tincidunt eu, felis.",
            "image_url": "http://dummyimage.com/198x160.bmp/5fa2dd/ffffff",
            "name": "CALCIUM CITRATE, IRON PENTACARBONYL, CHOLECALCIFEROL, .ALPHA.-TOCOPHEROL ACETATE, DL-, PYRIDOXINE HYDROCHLORIDE, FOLIC ACID, DOCUSATE SODIUM, DOCONEXENT, and ICOSAPENT",
            "price": 43929
          }, {
            "description": "Aliquam quis turpis eget elit sodales scelerisque. Mauris sit amet eros. Suspendisse accumsan tortor quis turpis.\n\nSed ante. Vivamus tortor. Duis mattis egestas metus.\n\nAenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.",
            "image_url": "http://dummyimage.com/227x150.bmp/cc0000/ffffff",
            "name": "GRANISETRON HYDROCHLORIDE",
            "price": 30953
          }, {
            "description": "Cras non velit nec nisi vulputate nonummy. Maecenas tincidunt lacus at velit. Vivamus vel nulla eget eros elementum pellentesque.\n\nQuisque porta volutpat erat. Quisque erat eros, viverra eget, congue eget, semper rutrum, nulla. Nunc purus.\n\nPhasellus in felis. Donec semper sapien a libero. Nam dui.",
            "image_url": "http://dummyimage.com/108x240.png/dddddd/000000",
            "name": "LEVOTHYROXINE SODIUM",
            "price": 47656
          }, {
            "description": "Integer ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.",
            "image_url": "http://dummyimage.com/161x226.bmp/cc0000/ffffff",
            "name": "Alprazolam",
            "price": 37286
          }, {
            "description": "Proin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.",
            "image_url": "http://dummyimage.com/235x223.png/5fa2dd/ffffff",
            "name": "PENTOXIFYLLINE",
            "price": 47731
          }, {
            "description": "Phasellus in felis. Donec semper sapien a libero. Nam dui.\n\nProin leo odio, porttitor id, consequat in, consequat ut, nulla. Sed accumsan felis. Ut at dolor quis odio consequat varius.\n\nInteger ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.",
            "image_url": "http://dummyimage.com/141x196.jpg/ff4444/ffffff",
            "name": "acetaminophen, chlorpheniramine maleate, and phenylephrine HCl",
            "price": 1061
          }, {
            "description": "Nam ultrices, libero non mattis pulvinar, nulla pede ullamcorper augue, a suscipit nulla elit ac nulla. Sed vel enim sit amet nunc viverra dapibus. Nulla suscipit ligula in lacus.\n\nCurabitur at ipsum ac tellus semper interdum. Mauris ullamcorper purus sit amet nulla. Quisque arcu libero, rutrum ac, lobortis vel, dapibus at, diam.",
            "image_url": "http://dummyimage.com/145x182.bmp/cc0000/ffffff",
            "name": "Chelidonium Curcuma",
            "price": 10286
          }, {
            "description": "Curabitur gravida nisi at nibh. In hac habitasse platea dictumst. Aliquam augue quam, sollicitudin vitae, consectetuer eget, rutrum at, lorem.\n\nInteger tincidunt ante vel ipsum. Praesent blandit lacinia erat. Vestibulum sed magna at nunc commodo placerat.",
            "image_url": "http://dummyimage.com/219x161.jpg/cc0000/ffffff",
            "name": "Arsenicum alb., Benzoicum acidum, Berber. vulg., Bryonia, Caladium seguinum, Cantharis, Ceanothus, Chelidonium majus, Chionanthus virginica, Cinchona, Daphne indica, Ignatia, Iris versicolor, Lycopodium, Nicotinum, Nux vom., Rhus toxicodendron, Scutellaria lateriflora, Tabacum, Echinacea, Taraxacum, Valeriana",
            "price": 6521
          }, {
            "description": "Duis bibendum, felis sed interdum venenatis, turpis enim blandit mi, in porttitor pede justo eu massa. Donec dapibus. Duis at velit eu est congue elementum.",
            "image_url": "http://dummyimage.com/156x137.jpg/cc0000/ffffff",
            "name": "TRICLOSAN",
            "price": 19716
          }, {
            "description": "In quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.",
            "image_url": "http://dummyimage.com/226x135.jpg/dddddd/000000",
            "name": "Clotrimazole",
            "price": 596
          }, {
            "description": "In hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.",
            "image_url": "http://dummyimage.com/147x248.jpg/ff4444/ffffff",
            "name": "ACYCLOVIR",
            "price": 1107
          }, {
            "description": "In congue. Etiam justo. Etiam pretium iaculis justo.\n\nIn hac habitasse platea dictumst. Etiam faucibus cursus urna. Ut tellus.\n\nNulla ut erat id mauris vulputate elementum. Nullam varius. Nulla facilisi.",
            "image_url": "http://dummyimage.com/175x135.bmp/ff4444/ffffff",
            "name": "sodium sulfacetamide, sulfur",
            "price": 7116
          }, {
            "description": "Pellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.",
            "image_url": "http://dummyimage.com/238x100.bmp/5fa2dd/ffffff",
            "name": "Amlodipine Besylate",
            "price": 15653
          }, {
            "description": "Integer ac leo. Pellentesque ultrices mattis odio. Donec vitae nisi.\n\nNam ultrices, libero non mattis pulvinar, nulla pede ullamcorper augue, a suscipit nulla elit ac nulla. Sed vel enim sit amet nunc viverra dapibus. Nulla suscipit ligula in lacus.\n\nCurabitur at ipsum ac tellus semper interdum. Mauris ullamcorper purus sit amet nulla. Quisque arcu libero, rutrum ac, lobortis vel, dapibus at, diam.",
            "image_url": "http://dummyimage.com/135x156.bmp/ff4444/ffffff",
            "name": "Levothyroxine Sodium",
            "price": 11982
          }, {
            "description": "Proin interdum mauris non ligula pellentesque ultrices. Phasellus id sapien in sapien iaculis congue. Vivamus metus arcu, adipiscing molestie, hendrerit at, vulputate vitae, nisl.\n\nAenean lectus. Pellentesque eget nunc. Donec quis orci eget orci vehicula condimentum.\n\nCurabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.",
            "image_url": "http://dummyimage.com/173x245.jpg/dddddd/000000",
            "name": "Indocyanine green",
            "price": 1448
          }, {
            "description": "Duis consequat dui nec nisi volutpat eleifend. Donec ut dolor. Morbi vel lectus in quam fringilla rhoncus.\n\nMauris enim leo, rhoncus sed, vestibulum sit amet, cursus id, turpis. Integer aliquet, massa id lobortis convallis, tortor risus dapibus augue, vel accumsan tellus nisi eu orci. Mauris lacinia sapien quis libero.\n\nNullam sit amet turpis elementum ligula vehicula consequat. Morbi a ipsum. Integer a nibh.",
            "image_url": "http://dummyimage.com/186x164.bmp/5fa2dd/ffffff",
            "name": "Cefaclor",
            "price": 11613
          }, {
            "description": "Curabitur in libero ut massa volutpat convallis. Morbi odio odio, elementum eu, interdum eu, tincidunt in, leo. Maecenas pulvinar lobortis est.\n\nPhasellus sit amet erat. Nulla tempus. Vivamus in felis eu sapien cursus vestibulum.",
            "image_url": "http://dummyimage.com/223x145.png/dddddd/000000",
            "name": "Acetaminophen, Dextromethorphan HBr, Doxylamine Succinate",
            "price": 46024
          }, {
            "description": "In quis justo. Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.\n\nMaecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/193x237.jpg/cc0000/ffffff",
            "name": "LIDOCAINE HYDROCHLORIDE",
            "price": 9279
          }, {
            "description": "Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo. Pellentesque viverra pede ac diam. Cras pellentesque volutpat dui.",
            "image_url": "http://dummyimage.com/229x239.png/dddddd/000000",
            "name": "ALUMINUM CHLOROHYDRATE",
            "price": 3646
          }, {
            "description": "Fusce posuere felis sed lacus. Morbi sem mauris, laoreet ut, rhoncus aliquet, pulvinar sed, nisl. Nunc rhoncus dui vel sem.\n\nSed sagittis. Nam congue, risus semper porta volutpat, quam pede lobortis ligula, sit amet eleifend pede libero quis orci. Nullam molestie nibh in lectus.\n\nPellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.",
            "image_url": "http://dummyimage.com/245x151.bmp/5fa2dd/ffffff",
            "name": "Duloxetine",
            "price": 7260
          }, {
            "description": "Phasellus in felis. Donec semper sapien a libero. Nam dui.",
            "image_url": "http://dummyimage.com/156x136.jpg/cc0000/ffffff",
            "name": "avobenzone, homosalate, octisalate, octocrylene and oxybenzone",
            "price": 45151
          }, {
            "description": "In hac habitasse platea dictumst. Morbi vestibulum, velit id pretium iaculis, diam erat fermentum justo, nec condimentum neque sapien placerat ante. Nulla justo.",
            "image_url": "http://dummyimage.com/189x161.bmp/dddddd/000000",
            "name": "Benzethonium chloride",
            "price": 18332
          }, {
            "description": "Aenean fermentum. Donec ut mauris eget massa tempor convallis. Nulla neque libero, convallis eget, eleifend luctus, ultricies eu, nibh.",
            "image_url": "http://dummyimage.com/150x242.bmp/cc0000/ffffff",
            "name": "alcohol",
            "price": 31510
          }, {
            "description": "Sed sagittis. Nam congue, risus semper porta volutpat, quam pede lobortis ligula, sit amet eleifend pede libero quis orci. Nullam molestie nibh in lectus.\n\nPellentesque at nulla. Suspendisse potenti. Cras in purus eu magna vulputate luctus.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vivamus vestibulum sagittis sapien. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
            "image_url": "http://dummyimage.com/173x211.png/5fa2dd/ffffff",
            "name": "ARNICA WHOLE PLANT",
            "price": 13506
          }]

        Item.AddItems({multiDoc: false}, undefined, itemsObject).then((result) => {
            expect(result).to.be.a('number');
            expect(result).to.equal(0);
            done();
        });
    });

    it('Update field in item ', (done) => {
        Item.UpdateItemProperty('', 'name', 'Addidas').then((result) => {
            expect(result).to.equal(0);
        }).catch(done);
    });

    it('Should get an item and return it', (done) => {
        Item.GetItem('').then((result) => {
            expect(result.item).to.be.be.an('object');
        })
    } )
    
});
