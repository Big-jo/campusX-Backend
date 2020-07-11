import chai, {expect} from 'chai';
import {S3} from '../../lib/s3';
// import it = Mocha.it;
import * as Path from 'path';
import * as fs from 'fs';
import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import {server} from '@server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';

const should = chai.should();
const userID = '5dda8548843d9d433ed23b4e';
let agent: SuperTest<Test>;
agent = supertest.agent(server);

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

describe('Test Media Object Storage', () => {
    it('should upload a user avatar',  done => {
        // const path = Path('/tmp/test1');
        // const data = fs.readFileSync(__dirname + '/tmp/test1.jpg', 'base64');
        try {
            agent.post('/api/v1/users/avatar/upload')
                .attach('avatar', __dirname + '/tmp/test1.jpg')
                .set('Authorization', `BEARER ${process.env.token}`)
                .end((err, res) => {
                    console.log(res.body);
                    expect(res.body.result.Location).to.be.a('string');
                    done();
                });
            // const s3 = new S3(userID, data);
            // const result = await s3.UploadAvatar();
            // console.log(result);
            // expect(result).to.not.be.null;
            // done();
        } catch (e) {
            done(e);
        }
        // console.log(file);
        // // const file = readFile()
        // // const s3 = new S3(userID, );
        // expect(file).to.not.be.null;
    }).timeout(15000);
});
