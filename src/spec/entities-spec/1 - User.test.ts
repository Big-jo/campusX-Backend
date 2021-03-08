import mongoose from 'mongoose';
import {expect} from 'chai';
import {describe} from 'mocha';
import {User} from '../../entities/User';
import {IUser} from '../../interfaces';
import UserModel from '../../models/User.model';
import {logger} from '../../shared';
import faker from 'faker';
import IORedis from 'ioredis';

const Db = mongoose.connection;
let primaryCache: IORedis.Redis;

before(() => {
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
    });
    // tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
    // tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));

    if (process.env.NODE_ENV === 'development') {
        primaryCache = new IORedis();
    }

    Db.dropCollection('users');

    primaryCache.on('connect', () => {
        logger.info('Redis Connected');
    });

    primaryCache.on('error', err => {
        logger.error(err);
        throw new Error(err.message);
    });
});

after(done => {
    primaryCache.quit();
    return mongoose.disconnect(done);
});

describe('User Methods', () => {

    async function GetUserIDs() {
        // Main User
        const users = await UserModel.find().sort({ _id: 1 }).exec();
        return [users[0]._id, users[1]._id];
    }

    it('Should create  2 users and return user details', done => {
        const user = [
            {
                name: `${faker.name.firstName(1)} ${faker.name.lastName(1)}`,
                userTag: faker.internet.userName(),
                email: faker.internet.email(),
                password: '111',
                userProfile: {
                    bio: faker.lorem.sentence(10),
                    gender: 'male',
                    university: 'Bells University Of Technology',
                    avatar: 'https://picsum.photos/200/300',
                },
            },
            {
                name: `${faker.name.firstName(0)} ${faker.name.lastName(0)}`,
                userTag: faker.internet.userName(),
                email: faker.internet.email(),
                password: '111',
                userProfile: {
                    bio: faker.lorem.sentence(10),
                    gender: 'male',
                    university: 'Bells University Of Technology',
                    avatar: 'https://picsum.photos/200/300',
                },
            },
        ] as unknown as IUser[];
        User.CreateUser(user[0]).then(result => {
            expect(result).to.be.an('object');
            expect(result.token).to.be.a('string');
            expect(result.user).to.be.an('object');
            expect(result.user).to.have.property('avatar');
            expect(result.user).to.have.property('userID');
            expect(result.user).to.have.property('userTag');
        }).catch(done);

        // Create second user
        User.CreateUser(user[1]).then(result => {
            expect(result).to.be.an('object');
            expect(result.token).to.be.a('string');
            expect(result.user).to.be.an('object');
            expect(result.user).to.have.property('avatar');
            expect(result.user).to.have.property('userID');
            expect(result.user).to.have.property('userTag');
            done();
        }).catch(done);
    });

    it('should return a users token and some other information', async () => {
        const doc = await UserModel.find().sort({ _id: 1 }).exec();
        const result = await User.Login(doc[0].email, '111');
        expect(result).to.be.an('object');
        expect(result.token).to.be.a('string');
        expect(result.user).to.be.an('object');
        expect(result.user).to.have.property('avatar');
        expect(result.user).to.have.property('userID');
        expect(result.user).to.have.property('userTag');
        expect(result.user).to.have.property('university');
    });

    it('should follow a user', async () => {
        const r = await User.FollowUser((await GetUserIDs())[1], (await GetUserIDs())[0], primaryCache);
        expect(r).to.not.have.property('error');
    });

    it('should get a user info with self search key', async () => {
        const result = await User.GetUser('self', (await GetUserIDs())[1], (await GetUserIDs())[0]);
        expect(result.self).to.have.property('name');
        expect(result.self).to.have.property('userProfile');
        expect(result.self).to.have.property('userTag');
        expect(result.self.userProfile).to.have.property('avatar');
    });

    it('should get another users info with the user key', async () => {
        const result = await User.GetUser('user', (await GetUserIDs())[1], (await GetUserIDs())[0]);
        expect(result.user).to.have.property('name');
        expect(result.user).to.have.property('userProfile');
        expect(result.user).to.have.property('userTag');
        expect(result.user.userProfile).to.have.property('avatar');
        expect(result.user.userProfile).to.have.property('bio');
        expect(result.user.userProfile).to.have.property('gender');
        expect(result.user.userProfile).to.have.property('university');
        expect(result).to.have.property('isFollowing');
        expect(result.isFollowing).to.be.a('boolean');

    });

    it('should return users and show if they are in the same campus', async () => {
        const result = await User.ConnectUser((await GetUserIDs())[1], 'sameCampus', 'Bells University Of Technology', null );
        expect(result).to.have.property('connectUsers');
        expect(result.connectUsers).to.be.an('array');
        expect(result.connectUsers.length).to.be.greaterThan(0);
    });
});
