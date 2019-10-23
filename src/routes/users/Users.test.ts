import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Start';
import { CREATED } from 'http-status-codes';
import { IUser } from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';
import followers from 'src/models/Follow.model';
import following from 'src/models/Following.model';

const should = chai.should();

chai.use(chaiHttp);

// beforeEach(() => {
//     if ((following.exists) || (followers.exists)) {
//         following.collection.drop();
//         followers.collection.drop();
//     }
// });

describe('/Sign Up', () => {
    // tslint:disable-next-line: only-arrow-functions
    it('Create a user and return credentials', function (done) {
        const userData = {
            user: {
                name: 'Joseph Henshaw',
                email: 'furiousjoe16@gmail.com',
                password: 'Mmedaraetuk16',
                phone_number: '08180286156',
                userTag: 'BigJoe',
                gender: 'male',
                userProfile: {
                    department: 'computer engineering',
                    gender: 'male',
                    university: 'Bells University Of Tecnology',
                },
            },
        };
        chai.request(Server)
            .post('/campusx/api/v1/users/create')
            .send(userData)
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    if (res.body.exists) {
                        res.body.should.have.property('exists');
                        done();
                    } else {
                        res.body.should.have.property('userID');
                        res.body.should.have.property('token');
                        res.body.should.have.property('success');
                        done();
                    }

                }

            });
    });
});

describe('/Log In', () => {
    it('Log a user in and return credentials ', (done) => {
        const userData = {
            email: '11243@gmail.com',
            password: '1111',
        };
        chai.request(Server)
            .post('/campusx/api/v1/users/login')
            .send(userData)
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('userID');
                    res.body.should.have.property('token');
                    res.body.should.have.property('success');
                    done();
                }
            });
    });
});

describe('/Follow user', () => {
    it('Follow a user and return a success message', (done) => {
        chai.request(Server)
            .post('/campusx/api/v1/users/follow')
            .send({ target: '5d91b6185dc6dd0d6b33a040', follower: '5d90e6e110d65453ad06cb00' })
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('status');
                    done();
                }
            });
    });
});

describe('/Generic get userInfo route', () => {
    it('Get followers', (done) => {
        chai.request(Server)
            .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/followers')
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('followers');
                    done();
                }
            });
    });

    it('Get followings', (done) => {
        chai.request(Server)
            .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/followings')
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('followings');
                    done();
                }
            });
    });

    it('/Get followings', (done) => {
        chai.request(Server)
            .get('/campusx/api/v1/users/getUser/5d91b6185dc6dd0d6b33a040/me')
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('user');
                    done();
                }
            });
    });
});

describe('/Update userprofile route', () => {
    it('Update userInfo and return success message', (done) => {
        chai.request(Server)
            .post('/campusx/api/v1/users/update')
            .send({ id: '5d91b6185dc6dd0d6b33a040', field: 'name', update: 'Antigha ' })
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('success');
                    done();
                }
            });
    });
});

describe('/Get a list of campuses', () => {
    it('Return a list of campuses', (done) => {
        chai.request(Server)
            .get('/campusx/api/v1/users/getcampuses')
            .end((err, res) => {
                if (res.body.err) {
                    res.body.should.have.property('err');
                    done();
                } else {
                    res.body.should.have.property('campuses');
                    done();
                }
            });
    });
});
