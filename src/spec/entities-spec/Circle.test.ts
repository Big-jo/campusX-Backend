// tslint:disable-next-line:no-console

import chai from 'chai';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
// tslint:disable-next-line:import-spacing
import { expect } from 'chai';
import { error } from 'winston';
import {Circle} from '../../entities/Circles/Circle';
import {ICircle} from '../../interfaces/ICircle';
import {ICirclePost} from '../../interfaces/ICirclePost';
import {CirclePost} from '../../entities/Circles/CirclePost';

const should = chai.should();
const userID = '5dda8548843d9d433ed23b4e';
const redisPort = Number(process.env.REDIS_PORT);
const client = new IORedis(redisPort);

before(() => {
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

    /* Set Up Redis */
    // client.on('connect', () => {
    //     console.log('connected');
    //     // console.log(x);
    // });

    // client.on('error', (err) => {
    //     // console.error(err);
    //     console.log(err);
    // });
});

describe('Circle Functions', () => {
    it('should create new circle', done => {
        const circleObject: ICircle =  {
            avatar: 'None',
            description: 'Just a space for space people',
            name: 'Space',
        };
        Circle.Create(circleObject).then(value => {
            expect(value).to.equal(0);
            done();
        }).catch(done);
    });

    it('should join a circle', done =>  {
        Circle.Join('5dda8548843d9d433ed23b4e', '5ea194efaf495f482aec212c').then(value => {
            expect(value).to.have.property('memberID');
            expect(value.memberID).to.be.a('string');
            done();
        }).catch(done)
    });

    it('should leave circe', done =>  {
        Circle.Leave('5ea19738e3f8fb4dd13efbb0').then((value: any) => {
            expect(value).to.equal(0);
            done();
        }).catch(done);
    });

    it('should post to a circle', done => {
        const postObject: ICirclePost = {
            userTag: 'Bigjo',
            author: '5dda8548843d9d433ed23b4e',
            text: 'Hiiii Circle',
            circle: '5ea194efaf495f482aec212c',
            image: '5ea194efaf495f482aec212c',
            campus: 'Bells University Of Technology'
        };

        // tslint:disable-next-line: max-line-length
        CirclePost.CirclePost(postObject, client, '5ea194efaf495f482aec212c', '5ea197f080c21b4ead7a254a').then(value => {
            expect(value).to.equal(0);
            done();
        });

    });

    it('should get feed from circle ', done => {
        Circle.GetCircleFeed('5ea194efaf495f482aec212c', client).then(value => {
            expect(value).to.have.property('circleFeed');
            expect(value.circleFeed).to.be.an('array');
            done();
        }).catch(done);
    });
});