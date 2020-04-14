// tslint:disable-next-line:no-console

import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Start';
import {CREATED} from 'http-status-codes';
import {IUser} from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';
import followers from 'src/models/Follower.model';
import following from 'src/models/Following.model';
import {Post} from '../../entities/Post';
import {IPost} from '../../interfaces/IPost';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
// tslint:disable-next-line:import-spacing
import  { expect } from 'chai';
import {error} from 'winston';

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
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));

    /* Set Up Redis */
    client.on('connect', () => {
        console.log('connected');
        // logger.log(x);
    });

    client.on('error', (err) => {
        // logger.error(err);
        console.log(err);
    });
});

describe('Post Related Functions', () => {
    it('should create a new post', (done) => {
        const post: IPost = {
            text: 'Testing 3',
            author: '5dda8548843d9d433ed23b4e',
            userTag: 'Big-Jo',
        };
        Post.CreatePost(post, userID, client).then((value) => {
            expect(value).to.be.a('number');
            done();
        }).catch((reason) => {
            console.log(reason);
        });
    });

    it('should like a post', (done) => {
        Post.LikePost(userID, '5e91ea9a2817fa581481411f').then((value) => {
            expect(value).to.be.a('number');
            done();
        }).catch(done);
    });

    // TODO: A user shouldn't be able to both like and unlike a post
    it('should dislike a post', (done) => {
        Post.DislikePost(userID, '5dda87f687ef1e4394fce929').then((value) => {
            expect(value).to.be.a('number');
            done();
        }).catch(done);
    });

    // TODO: A user shouldn't be able to both like and unlike a post
    it('should trash a post', (done) => {
        Post.DislikePost(userID, '5dda87f687ef1e4394fce929').then((value) => {
            expect(value).to.be.a('number');
            done();
        }).catch(done);
    });

    it('should get newsfeed', (done) => {
        // tslint:disable-next-line:max-line-length
         Post.GetPosts('1', client, '5dda87f687ef1e4394fce929', {mostRecent: true}).then((reply) => {
            expect(reply).to.have.property('newsfeed');
            expect(reply!.newsfeed).to.be.an('Array');
            done();
        }).catch(done);
    });

    it('should get home timeline', function() {

    });
});
