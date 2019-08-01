import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Server';
import { CREATED } from 'http-status-codes';
import { IUser } from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';

const should = chai.should();

chai.use(chaiHttp);

beforeEach(() => {
    UserModel.collection.drop();
});

describe('/Create User', () => {
    it('Create a user and return credentials', (done) => {
        const userData = {
            name: 'Joseph Henshaw',
            email: 'furiousjoe16@gmail.com',
            password: 'Mmedaraetuk16',
            phone_number: '08180286155',
            userTag: '@Bigjo',
            gender: 'male',
            user_profile: {
                department: 'computer engineering',
                gender: 'male',
                level: 300,
                university: 'Bells University Of Tecnology',
            },
        };
        chai.request(Server)
            .post('/api/users/create')
            .send(userData)
            .end((err, res) => {
                if (err) { res.body.should.have.property('err'); }
                res.body.should.have.property('userID');
                res.body.should.have.property('jwt');
                done();
            });
    });
});

describe('/Log In', () => {
    it('Log a user in and return credentials ', (done) => {
        const userData = {
            email: 'furiousjoe16@gmail.com',
            password: 'Mmedaraetuk16',
        };
        chai.request(Server)
            .post('/api/users/create')
            .send(userData)
            .end((err, res) => {
                if (err) { res.body.should.have.property('err'); }
                res.body.should.have.property('userID');
                res.body.should.have.property('success');
                res.body.should.have.property('token');
                done();
            });
    });

});
