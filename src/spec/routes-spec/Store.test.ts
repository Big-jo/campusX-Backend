
import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import app from '../../Server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';
import {expect} from 'chai';


const BaseApi = '/api/v1/store';
// const createUserPath = `${usersPath}/create`;
// const loginUserPath = `${usersPath}/login`;
// const getUserInfo = `${usersPath}/queryUser/5e7d47e80cb878546927c7d8`;

let agent: SuperTest<Test>;
agent = supertest.agent(app);

before(done => {
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
	done();
});

after(done => {
	mongoose.disconnect();
	done();
});

describe('create store', () => {
	it('should create a store 201', done => {
		agent.post(`${BaseApi}/create`)
			.send({

			})
			.end((err: Error, res: Response) => {
			expect(res.status).to.equal(CREATED);
			expect(res.body.token).to.be.a('string');
			done()
		});
	});
});

describe('login into store', () => {
	it('should return 200', done => {
		agent.post(`${BaseApi}/login`).end((err, res) => {
			expect(res.status).to.equal(OK);
			expect(res.body.token).to.be.a('string');
			done();
		})
	});
});

describe('Get store catalogue', () => {
	it('should return 200 and catalogue array', done => {
		agent.get(`${BaseApi}/catalogue`).end((err, res) => {
			expect(res.status).to.equal(200);
			expect(res.body.catalogue).to.be.an('array');
			done();
		});
	});
});
