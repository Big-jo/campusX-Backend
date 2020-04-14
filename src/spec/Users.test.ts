import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import Server from '../Start';
import { CREATED } from 'http-status-codes';
import { IUser } from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';
import followers from 'src/models/Follower.model';
import following from 'src/models/Following.model';
import { User } from '../entities/User';
import mongoose from 'mongoose';
import { logger } from '../shared/Logger';
import {error} from 'winston';
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
    it('should create a new user and return a token', (done) => {
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
        
        User.CreateUser(user).then((returned) => {
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

    it('should return a token',  (done) => {
         User.Login('furiousjoe16@gmail.com', 'Mmedaraetuk16').then((result) => {
             token = result!.token;
             expect(result).to.be.an('object');
            done();
        }).catch((done));
    });

    it('should follow a user', (done) => {
        User.FollowUser('5dda8548843d9d433ed23b4e', '5e91304bf271a262d583bfa9').then((result) => {
            expect(result).to.be.a('number');
            done();
        }).catch(done);
    });

    it('should return a user/s profile', (done) => {
        User.GetUser('user', '5dda8548843d9d433ed23b4e').then((result) => {
            expect(result).to.have.property('user');
            expect(result!.user).not.to.be.an('array');
            done();
        }).catch(done);
    });

    it('should update a user field and return a number', (done) => {
        User.UpdateUser('name', '5dda8548843d9d433ed23b4e', 'Richard Henshaw').then((result) => {
            expect(result).to.be.a('number');
            expect(result).to.equal(0);
            done();
        }).catch(done);
    });

    it('should get users home timeline', () => {
        User.GetUserPosts(userID).then((value) => {
            expect(value).to.be.an('Array');
        });
    });
});

// describe('/Sign Up', () => {
//     // tslint:disable-next-line: only-arrow-functions
//     it('Create a user and return credentials', function(done) {
//            
//         //    chai.request(Server)
//         //     .post('/campusx/api/v1/users/create')
//         //     .send(user)
//         //     .end((err, res) => {
//         //         if (res.body.err) {
//         //             res.body.should.have.property('err');
//         //             done();
//         //         } else {
//         //             if (res.body.exists) {
//         //                 res.body.should.have.property('exists');
//         //                 done();
//         //             } else {
//         //                 res.body.should.have.property('userID');
//         //                 res.body.should.have.property('token');
//         //                 res.body.should.have.property('success');
//         //                 done();
//         //             }

//         //         }

//         //     });
//     });
// });

// describe('/Log In', () => {
//     it('Log a user in and return credentials ', (done) => {
//         const userData = {
//             email: '11243@gmail.com',
//             password: '1111',
//         };
//         chai.request(Server)
//             .post('/campusx/api/v1/users/login')
//             .send(userData)
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('userID');
//                     res.body.should.have.property('token');
//                     res.body.should.have.property('success');
//                     done();
//                 }
//             });
//     });
// });

// describe('/Follow user', () => {
//     it('Follow a user and return a success message', (done) => {
//         chai.request(Server)
//             .post('/campusx/api/v1/users/follow')
//             .send({ target: '5d91b6185dc6dd0d6b33a040', follower: '5d90e6e110d65453ad06cb00' })
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('status');
//                     done();
//                 }
//             });
//     });
// });

// describe('/Generic get userInfo route', () => {
//     it('Get followers', (done) => {
//         chai.request(Server)
//             .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/followers')
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('followers');
//                     done();
//                 }
//             });
//     });

//     it('Get followings', (done) => {
//         chai.request(Server)
//             .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/followings')
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('followings');
//                     done();
//                 }
//             });
//     });

//     it('/Get followings', (done) => {
//         chai.request(Server)
//             .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/me')
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('user');
//                     done();
//                 }
//             });
//     });
// });

// describe('/Update userprofile route', () => {
//     it('Update userInfo and return success message', (done) => {
//         chai.request(Server)
//             .post('/campusx/api/v1/users/update')
//             .send({ id: '5d91b6185dc6dd0d6b33a040', field: 'name', update: 'Antigha ' })
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('success');
//                     done();
//                 }
//             });
//     });
// });

// describe('Get a list of campuses', () => {
//     it('Return a list of campuses', (done) => {
//         chai.request(Server)
//             .get('/campusx/api/v1/users/getcampuses')
//             .end((err, res) => {
//                 if (res.body.err) {
//                     res.body.should.have.property('err');
//                     done();
//                 } else {
//                     res.body.should.have.property('campuses');
//                     done();
//                 }
//             });
//     });
// });
