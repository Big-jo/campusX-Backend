// tslint:disable-next-line:no-reference
///<reference path="../../../node_modules/@types/mocha/index.d.ts" />

import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import app from '../../Server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';
import {logger} from '../../shared/Logger';
import {expect} from 'chai';
import { createUserPath, loginPath, getUserInfo } from '../../routes/users/Users';

const usersBaseApi = '/api/v1/users';
// const createUserPath = `${usersPath}/create`;
// const loginUserPath = `${usersPath}/login`;
// const getUserInfo = `${usersPath}/queryUser/5e7d47e80cb878546927c7d8`;

let agent: SuperTest<Test>;
agent = supertest.agent(app);

before((done) => {
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

after((done) => {
    mongoose.disconnect();
    done();
});

const user = {
    name: 'Joseph Henshaw',
    email: 'furiousjoe16@gmail.com',
    password: 'Mmedaraetuk16',
    phoneNumber: '08180286156',
    userTag: 'BigJoe',
};

describe('Create new user and check if user exist', () => {
    it(`should return an JSON object with a token and a status code of ok if
        successful`, (done) => {
        agent.post(`${usersBaseApi}${createUserPath}`).send(user)
            .end((err: Error, res: Response) => {
                logger.error(err);
                if (res.status === BAD_REQUEST) {
                    logger.error(err);
                    expect(res.status).to.equal(BAD_REQUEST);
                    expect(res.body.exist).to.equal(true);
                    expect(res.body.error).to.equal(undefined);
                    done();
                } else {
                    expect(res.status).to.equal(CREATED);
                    expect(res.body.error).to.equal(undefined);
                    done();
                }
            });
    });
});

describe('Log In User', () => {
    it('should return token', (done) => {
        const request = {
            email: 'furiousjoe16@gmail.com',
            password: 'Mmedaraetuk16',
        };
        agent.post(`${usersBaseApi}${loginPath}`).send(request).end((err: Error, res: Response) => {
            logger.error(err);
            
            if (res.body.exist) {
                expect(res.body.exist).to.equal(false);
            } else {
                expect(res.body).to.have.property('token');
                expect(res.body.result).to.not.equal(undefined);
                expect(res.status).to.not.equal(INTERNAL_SERVER_ERROR);
                done();
            }
        });
    });
});

describe('Get user info', () => {

    it('should return user followers', (done) => {
        agent.get(`${getUserInfo}?queryField=followers`).end((err: Error, res: Response) => {
            logger.error(err);
            expect(res.body.queryResult).to.have.property('followers');
            expect(res.body.queryResult.followers).to.not.equal([]);
            done();
        });
    });

    it('should return user followings', (done) => {
        agent.get(`${getUserInfo}?queryField=followings`).end((err: Error, res: Response) => {
            logger.error(err);
            expect(res.body.queryResult).to.have.property('followings');
            expect(res.body.queryResult.followings).to.not.equal([]);
            done();
        });
    });

    it('should return the user profile', (done) => {
        agent.get(`${getUserInfo}?queryField=profile`).end((err: Error, res: Response) => {
            logger.error(err);
            expect(res.body.result).to.have.property('userProfile');
            // tslint:disable-next-line:no-unused-expression
            expect(res.body.resut).to.not.be.empty;
            done();
        });
    });
});
