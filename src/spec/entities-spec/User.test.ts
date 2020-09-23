import chai from 'chai';
import mongoose from 'mongoose';
import { expect } from 'chai';
import { describe } from 'mocha';

import { User } from '../../entities/User';
import { IUser } from '../../interfaces/IUser';

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

    Db.dropDatabase().then(() => {
        console.log('dropped');
    }).catch(e => {
        console.log(e.message);
    });
});

after(() => {
    Db.close();
});

describe('User Interactions', () => {

    // Main User
    let userID01: string;

    let userID02: string;

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
            userID02 = result.user.userID;
            done();
        }).catch(done);
    });

    it('should return a users token and some other information', done => {
        User.Login('doe@gmail.com', '111').then(result => {
            userID01 = result.user.userID;

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

    it('should follow a user', () => {
        User.FollowUser(userID02, userID01).then(result => {
            expect(result).to.equal(0);
        });
    });

    // it('should get a people the users follows with the follows search key ', done => {
    //     // Here, user2 is the user to get his followers
    //     User.GetUser('follows', userID01, undefined)
    //         .then(result => {
    //             console.log(result);
    //             expect(result.follows).to.have.property('name');
    //             expect(result.follows).to.have.property('userProfile');
    //             expect(result.follows).to.have.property('userTag');
    //             expect(result.follows).to.have.property('avatar');
    //             done();
    //         }).catch(done);
    // });

    // it('should get a users followings with the followings search key', done => {
    //     User.GetUser('followings', userID02, userID01)
    //         .then(result => {
    //             expect(result.followings).to.have.property('name');
    //             expect(result.followings).to.have.property('userProfile');
    //             expect(result.followings).to.have.property('userTag');
    //             expect(result.followings).to.have.property('avatar');
    //             done();
    //         }).catch(done);
    // });

    it('should get a user info with self search key', done => {
        User.GetUser('self', userID02, userID01)
            .then(result => {
                expect(result.self).to.have.property('name');
                expect(result.self).to.have.property('userProfile');
                expect(result.self).to.have.property('userTag');
                expect(result.self.userProfile).to.have.property('avatar');
                done();
            }).catch(done);

    });

    it('should get another users info with the user key', done => {
        User.GetUser('user', userID02, userID01)
            .then(result => {
                expect(result.user).to.have.property('name');
                expect(result.user).to.have.property('userProfile');
                expect(result.user).to.have.property('userTag');
                expect(result.user.userProfile).to.have.property('avatar');
                expect(result.user.userProfile).to.have.property('bio');
                expect(result.user.userProfile).to.have.property('gender');
                expect(result.user.userProfile).to.have.property('university');
                expect(result).to.have.property('isFollowing');
                expect(result.isFollowing).to.be.a('boolean');
                done();
            }).catch(done);
    });

    it('should return users and show if they are in the same campus', (done) => {
        User.ConnectUser(userID01, 0).then((result) => {
            // console.log(result);

            expect(result).to.have.property('connectUsers');
            expect(result.connectUsers).to.be.an('array');
            expect(result.connectUsers.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });
});
