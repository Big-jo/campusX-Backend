import {BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, OK} from 'http-status-codes';
import {Response, SuperTest, Test} from 'supertest';
import supertest from 'supertest';
import {server} from '@server';
// import {paramMissingError} from '@shared/constants';
import mongoose from 'mongoose';
import {logger} from '../../shared/Logger';
import {expect} from 'chai';
import {createUserPath, loginPath, getUserInfo} from '../../routes/users/Users.route';
import {IPost, IComment} from 'src/interfaces/IPost';

const BaseApi = '/api/v1/post';
// const createUserPath = `${usersPath}/create`;
// const loginUserPath = `${usersPath}/login`;
// const getUserInfo = `${usersPath}/queryUser/5e7d47e80cb878546927c7d8`;

let agent: SuperTest<Test>;
agent = supertest.agent(server, {});
const token = process.env.token as string;
const postID = '5e91ea9a2817fa581481411f';
const userID = '5dda8548843d9d433ed23b4e';

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

describe('Create Post', () => {
    const post = {
        userTag: '@Big-jo',
        author: 'Joseph Henshaw',
        text: 'Testing this image out',
        options: {
            anonymous: false,
        },
    };

    it('Should create a post with just text and return 201', done => {
        agent.post(`${BaseApi}/create`)
            .send(post)
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(CREATED);
                done();
            });
    });

    it('Should create a post with just text and an image and return 201', done => {
        agent.post(`${BaseApi}/create`)
            .field('postObject', JSON.stringify(post))
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .attach('image', __dirname + '/test-media/picture.jpg')
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(CREATED);
                done();
            });
    });
});

describe('Post Interactions', () => {

    it('Like a post and return 200', done => {
        agent.post(`${BaseApi}/like`)
            .send({postID})
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(200);
                done();
            });
    });

    it('Dislike a post and return 200', done => {
        agent.post(`${BaseApi}/dislike`)
            .send({postID})
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(200);
                done();
            });
    });

});

describe('Comment Operations', () => {
    const comment: IComment = {
        parentPost: postID,
        userTag: '@Big-jo',
        author: userID,
        text: 'Heyyy there',
        campus: 'Bells University Of Technology',
        image: '....',
        name: 'Joseph Henshaw',
        video: '....',
    };

    it('should create a comment and return 201', done => {
        agent.post(`${BaseApi}/comment`)
            .send(comment)
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(CREATED);
                done();
            });
    });

    it('should get all comments', done => {
        agent.get(`${BaseApi}/comments/${postID}`)
            .set('Authorization', `Authorization ${process.env.token as string}`)
            .end((err: Error, res: Response) => {
                expect(res.status).to.equal(OK);
                expect(res.body.result).to.have.property('comments');
                done();
            });
    });

});
