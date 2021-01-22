import mongoose from 'mongoose';
import { expect } from 'chai';
import { describe } from 'mocha';

import { User } from '../../entities/User';
import { IUser } from '../../interfaces/IUser';
import UserModel from '../../models/User.model';
import {logger} from '@shared';

const Db = mongoose.connection;

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

    Db.dropCollection('users').then(() => {
        logger.log('info', 'dropped');
    }).catch(e => {
        logger.error(e.message);
    });

    // Db.dropCollection('follows').then(() => {
    //     console.log('dropped');
    // }).catch(e => {
    //     console.log(e.message);
    // });

    // Db.dropCollection('followings').then(() => {
    //     console.log('dropped');
    // }).catch(e => {
    //     console.log(e.message);
    // });
});

after(() => {
    Db.close();
});

describe('User Interactions', () => {

    async function GetUserIDs() {

        // Main User

        const userID01 = await UserModel.findOne({email: 'doe@gmail.com'}).exec();

        const userID02 = await UserModel.findOne({email: 'janey@gmail.com'}).exec();

        const x = [userID01._id, userID02._id];
        return x;
    }

    it('Should create a 2 users and return user details', done => {
        const user = [
            {
                name: 'John Doe',
                userTag: 'Doee',
                email: 'doe@gmail.com',
                password: '111',
                userProfile: {
                    bio: 'Lolz',
                    gender: 'Male',
                    university: 'Bells University Of Technology',
                    avatar: 'https://picsum.photos/200/300',
                },
            },
            {
                name: 'jane Thommy',
                userTag: 'jane07',
                email: 'janey@gmail.com',
                password: '111',
                userProfile: {
                    bio: 'We Move',
                    gender: 'female',
                    university: 'Bells University Of Technology',
                    avatar: 'https://picsum.photos/200/300',
                },
            },

        ] as IUser[];

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
            done();
        }).catch(done);
    });

    it('should return a users token and some other information', done => {
        User.Login('doe@gmail.com', '111').then(result => {
            expect(result).to.be.an('object');
            expect(result.token).to.be.a('string');
            expect(result.user).to.be.an('object');
            expect(result.user).to.have.property('avatar');
            expect(result.user).to.have.property('userID');
            expect(result.user).to.have.property('userTag');
            expect(result.user).to.have.property('university');
            done();
        }).catch(done);
    });

    it('should follow a user', async () => {
        Db.dropCollection('follows').catch();
        Db.dropCollection('followings').catch();
        // console.log((await GetUserIDs())[1], (await GetUserIDs())[0]);
        const r = await User.FollowUser((await GetUserIDs())[1], (await GetUserIDs())[0]);
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
        const result = await User.ConnectUser((await GetUserIDs())[1], 0);
        expect(result).to.have.property('connectUsers');
        expect(result.connectUsers).to.be.an('array');
        expect(result.connectUsers.length).to.be.greaterThan(0);
    });
});
