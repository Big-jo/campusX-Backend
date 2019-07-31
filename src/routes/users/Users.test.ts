import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Server';

const should = chai.should();

chai.use(chaiHttp);

// Test /Get route

describe('/Get Users', () => {
    it('it should get all users', (done) => {
        chai.request(Server)
            .get('/users')
            .end((err, res) => {
                res.should.have.status(200);
                done();
            });
    });
});
