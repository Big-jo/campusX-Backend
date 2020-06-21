// tslint:disable-next-line:no-console

import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Start';
import { CREATED } from 'http-status-codes';
import { IUser } from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';
import followers from 'src/models/Follower.model';
import following from 'src/models/Following.model';
import { Post } from '../../entities/Post';
import {IComment, IPost} from '../../interfaces/IPost';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
// tslint:disable-next-line:import-spacing
import { expect } from 'chai';
import { error } from 'winston';

const should = chai.should();
const userID = '5dda8548843d9d433ed23b4e';
const userID2 = '5dda87f687ef1e4394fce929';
const postID = '5e91ea9a2817fa581481411f';
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

    // client.on('error', err => {
    //     // console.error(err);
    //     console.log(err);
    // });
});

describe('Post Related Functions', () => {
    it('should create a new post', done => {
        const post: IPost = {
            text: 'Testing 5',
            author: '5dda8548843d9d433ed23b4e',
            userTag: 'Big-Jo',
            campus: 'Bells University Of Technology',
        };
        Post.CreatePost(post, userID, client, {anonymous: false}).then(value => {
            expect(value!.opsValue).to.be.a('number');
            done();
        }).catch(reason => {
            console.log(reason);
        });
    });

    it('should like a post', done => {
        Post.LikePost(userID, '5e91ea9a2817fa581481411f').then(value => {
            expect(value).to.be.a('number');
            done();
        }).catch(done);
    });

    // TODO: A user shouldn't be able to both like and unlike a post
    it('should dislike a post', done => {
        Post.DislikePost(userID, '5e91eb8dc030c258ea58247b').then(value => {
            expect(value).to.be.a('number');
            done();
        }).catch(done);
    });

    // TODO: A user shouldn't be able to both like and unlike a post
    // it('should trash a post', (done) => {
    //     Post.DislikePost(userID, '5dda87f687ef1e4394fce929').then((value) => {
    //         expect(value).to.be.a('number');
    //         done();
    //     }).catch(done);
    // });

    it('should get newsfeed', done => {
        // tslint:disable-next-line:max-line-length
        Post.GetPosts(client, userID2, { mostRecent: true }).then(reply => {
            expect(reply).to.have.property('newsfeed');
            expect(reply!.newsfeed).to.be.an('Object');
            done();
        }).catch(done);
    });

    it('should comment on a post', () => {
        const comment: IComment = {
            campus: 'Bells University Of Technology',
            name: 'Ricko Lime',
            userTag: '@Rickyy',
            author: userID,
            text: 'Oh well !!',
            parentPost: postID,
        };
        Post.Comment(comment).then(value => {
            expect(value).to.be.a('number');
        });
    });

    it('should get all comments on a post', () => {
        Post.GetComments(postID).then(value => {
            expect(value.comments).to.be.an('object');
        });
    });
    // it('should get home timeline', function () {
    //
    // });
});
