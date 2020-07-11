import chai, { expect } from 'chai';
import { User } from '../../entities/User';
import mongoose from 'mongoose';
// import it = Mocha.it;

const should = chai.should();
const userID = '5dda8548843d9d433ed23b4e';

let token;
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

describe('User Related Functions', () => {
    it('should create a new user and return a token', done => {
        const user = {
            name: 'Joseph Henshaw',
            email: 'furiousjoe288@gmail.com',
            password: 'Mmedaraetuk16',
            phone_number: '08180286156',
            userTag: 'BigJoe',
            gender: 'male',
            // userProfile: {
            //     department: 'computer engineering',
            //     gender: 'male',
            //     university: 'Bells University Of Tecnology',
            //     bio: 'Wow',
            // },
        };

        User.CreateUser(user).then(returned => {
            if (returned.exist) {
                expect(returned).to.be.an('object');
                done();
            } else {
                expect(returned).to.be.an('object');
                expect(returned).to.have.property('token');
                expect(returned.token).to.be.a('string');
                done();
            }
        }).catch(done);

    });

    it('should return a token', done => {
        User.Login('furiousjoe16@gmail.com', 'Mmedaraetuk16').then(result => {
            token = result!.token;
            expect(result).to.be.an('object');
            expect(result.token).to.be.a('string');
            done();
        }).catch((done));
    });

    it('should return a login error', done => {
        User.Login('furiousjoe16@gmail.com', 'Mmedaraetuk').then(result => {
            token = result.token;
            expect(result.incorrect).to.equal(true);
            done();
        }).catch((done));
    });

    it('should follow a user', done => {
        User.FollowUser('5dda8548843d9d433ed23b4e', '5e91304bf271a262d583bfa9').then(result => {
            expect(result).to.be.a('number');
            done();
        }).catch(done);
    });

    it('should return a user/s profile', done => {
        User.GetUser('user', '5dda8548843d9d433ed23b4e').then(result => {
            expect(result).to.have.property('user');
            expect(result!.user).not.to.be.an('array');
            done();
        }).catch(done);
    });

    it('should update a user field and return a number', done => {
        User.UpdateUser('name', '5dda8548843d9d433ed23b4e', 'Richard Henshaw').then(result => {
            expect(result).to.be.a('number');
            expect(result).to.equal(0);
            done();
        }).catch(done);
    });

    it('should get users home timeline', () => {
        User.GetUserPosts(userID).then(value => {
            expect(value).to.be.an('Array');
        });
    });

    it('should get users from same campus and other campuses', function(done) {
        User.ConnectUser(userID).then(value => {
            console.log(value);
            expect(value).to.be.an('object');
            expect(value).to.have.property('onCampusUsers');
            expect(value).to.have.property('onOtherCampuses');
            done();
        }).catch(done);
    });
});
