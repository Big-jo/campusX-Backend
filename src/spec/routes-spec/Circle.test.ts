import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import app from '../../Server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';
import {logger} from '@shared';
import {expect} from 'chai';
// import {createUserPath, loginPath, getUserInfo} from '../../routes/users/Users';
// import {IPost, IComment} from '../../interfaces/IPost';
import {ICircle} from '../../interfaces/ICircle';

const BaseApi = '/api/v1/circles';
const userID = '5dda8548843d9d433ed23b4e';
const circleID = '5ea194efaf495f482aec212c';
const memberID = '5ea197f080c21b4ead7a254a';

let agent: SuperTest<Test>;
agent = supertest.agent(app);

before(done => {
	const URI = process.env.MONGO_URI as string;
	mongoose.connect(URI, {
		useNewUrlParser: true,
		useFindAndModify: false,
		useCreateIndex: true,
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

describe('create circle', () => {
	const circleObject: ICircle = {
		avatar: 'None',
		description: 'Just a space for Intellectual people',
		name: 'Intellectuals',
	};

	it('should create a new circle', done => {
		agent.post(`${BaseApi}/create`).send({circleObject}).end((err, res) => {
			expect(res.status).to.equal(CREATED);
			done();
		});
	});
});

describe('join circle', () => {
	it('should join a circle return a memberID and 200', done => {
		agent.post(`${BaseApi}/join`).end((err, res) => {
			expect(res.status).to.equal(OK);
			expect(res.body.memberID).to.be.a('string');
			done();
		});
	});
});

describe('leave circle', () => {
	it('should join a circle and return 200', done => {
		const object = {
			userID,
			circleID,
		};
		agent.post(`${BaseApi}/join`).send(object).end((err, res) => {
			logger.error(err);
			expect(res.status).to.equal(OK);
			done();
		});
	});
});

describe('get circle feed', () => {
	it('should return a feed array with posts', done => {
		agent.get(`${BaseApi}/circle-feed`).end((err, res) => {
			expect(res.status).to.equal(OK);
			expect(res.body).to.have.property('circleFeed');
			done();
		});
	});
});

describe('create a circle post', () => {
	const object = {
		post: {
			userTag: '@Big-jo',
			author: 'Joseph Henshaw',
			text: 'Test 2',
		},
		memberID: '5ea197f080c21b4ead7a254a',
		circleID: '5ea194efaf495f482aec212c',
	};

	it('should create a circle post and return 201', done => {
		agent.post(`${BaseApi}/post`).send(object).end((err, res) => {
			logger.error(err);
			expect(res.status).to.equal(CREATED);
			done();
		});
	});
});
