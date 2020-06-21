import chai, {expect} from 'chai';
import mongoose from 'mongoose';
const redisPort = Number(process.env.REDIS_PORT);
import IORedis from 'ioredis';
import {IPost} from '../../interfaces/IPost';
import {Post} from '../../entities/Post';
import {Campus} from '../../entities/Campus';
const client = new IORedis(redisPort);
const userID = '5dda8548843d9d433ed23b4e';


before( () => {
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

describe('Campus related functions', () => {
    it('should get all campuses available',done => {
        const post: IPost = {
            text: 'Testing 5',
            author: '5dda8548843d9d433ed23b4e',
            userTag: 'Big-Jo',
            campus: 'Bells University Of Technology',
        };

        Post.CreatePost(post, userID, client, {anonymous: false}).then( result => {
            console.log(result);
            result!.opsValue !== 0 ? process.exit() : console.log(result);
        });

        Campus.GetList(client).then(value => {
            console.log(value);
            expect(value).have.property('campuses');
            expect(value.campuses).to.be.an('array');
            expect(value.campuses).to.not.be.empty;
            done();
        });
    });

    it('should get posts in a campus', done =>  {
        Campus.GetPosts(client, 'Bells University Of Technology').then(value => {
            expect(value.posts).to.be.an('object');
            done();
        });
    });
});
