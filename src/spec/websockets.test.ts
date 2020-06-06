import chai from 'chai';
import * as io from 'socket.io-client';
import mongoose from 'mongoose';

const should = chai.should();

const socketUrl = 'http://0.0.0.0:3000/';

const options = {
    'transports': ['websocket'],
    'force new connection': false,
};

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

    // const client1 = io.connect(socketUrl, options);
    //
    // client1.on('connection', (data: any) => {
    //     console.log(data);
    // });
});


describe('Newsfeed Service', () => {
    it('should log a connection',done => {
        const client1 = io.connect(socketUrl, options);
        /**
         * On first connection emit 'get-feed' to get user feed
         */
        client1.on('connect', (data: any) => {
            client1.emit('get-feed');
        });

        client1.on('newsfeed', data => {
            console.log(data);
            done();
        });

    });
});
