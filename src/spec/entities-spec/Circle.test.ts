// tslint:disable-next-line:no-console

import chai from 'chai';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
// tslint:disable-next-line:import-spacing
import { expect } from 'chai';
import { error } from 'winston';

import { Circle } from '../../entities/Circles/Circle';
import { ICircle } from '../../interfaces/ICircle';
import { ICircleComment, ICirclePost } from '../../interfaces/ICirclePost';
import { CirclePost } from '../../entities/Circles/CirclePost';
import CircleModel from '../../models/Circle.model';
import { User } from '../../entities/User';
import faker, { fake } from 'faker';
import CircleMemberModel from '../../models/CircleMember.model';
import CirclePostModel from '../../models/CirclePost.model';

const should = chai.should();
let user01;

function GetCircle() {
    let circle;
    CircleModel.find({}).limit(1).sort({ $natural: -1 }).lean().exec().then(r => circle = r._id);
    return circle;
}

function GetMemberID() {
    let memberID;
    CircleMemberModel.findOne({ circle: GetCircle(), userID: user01 }).exec().then(r => memberID = r._id);
    return memberID;
}

function GetCirclePost() {
    let postID;
    CirclePostModel.findOne({ circle: GetCircle(), userID: user01 }).exec().then(r => postID = r._id);
    return postID;
}

before(async () => {
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

    // Get A UserID
    user01 = await (await User.Login('doe@gmail.com', '111')).user.userID;
});

describe('Basic Circle Tests', () => {
    it('should create new circle', done => {

        const circleObject = {
            avatar: 'None',
            description: 'Just a space for space people',
            name: 'Space',
        } as ICircle;

        Circle.Create(circleObject, user01).then(value => {
            done();
        }).catch(done);
    });

    it('should join a circle', done => {
        // Get A CircleID

        const circle01ID = GetCircle();

        Circle.Join(user01, circle01ID).then(value => {
            expect(value).to.have.property('memberID');
            expect(value.memberID).to.be.a('string');
            done();
        }).catch(done);
    });

    it('should leave circe', done => {
        Circle.Leave(GetCircle(), user01).then((value: any) => {
            expect(value).to.equal(0);
            done();
        }).catch(done);
    });

    it('should get circles with 10 items first', done => {
        Circle.GetCircles(10).then(value => {
            console.log(value.circles[0].docs);
            expect(value.circles).to.equal(10);
            done();
        }).catch(done);
    });
});

describe('Circle Post Feed', () => {

    it('should create circle posts', done => {
        const circlePost: ICirclePost = {
            campus: faker.company.companyName(),
            circle: GetCircle(),
            memberID: GetMemberID(),
            author: user01,
            text: faker.lorem.sentences(10),
            parentPost: '',
        };

        CirclePost.CirclePost(circlePost, undefined, GetCircle()).then(r => {
            done();
        }).catch(error);
    });

    it('should get feed from circle ', done => {
        Circle.GetCircleFeed(GetCircle(), user01, 1, 10).then(value => {
            expect(value).to.have.property('circleFeed');
            expect(value.circleFeed).to.be.an('array');
            done();
        }).catch(done);
    });

    it('should like a post', done => {
        CirclePost.LikePost(user01, GetCirclePost(), 'circlePost').then(r => {
            CirclePostModel.findOne({ _id: GetCirclePost(), $in: { likedBy: [user01] } })
                .exec().then(s => {
                    expect(s).to.equal(true);
                },
                );
        });
    });

    it('should comment on a post', done => {
        const circlePost: ICircleComment = {
            campus: faker.company.companyName(),
            circle: GetCircle(),
            memberID: GetMemberID(),
            author: user01,
            text: faker.lorem.sentences(10),
            parentPost: GetCirclePost(),
        };

        CirclePost.CircleComment(circlePost, undefined).then(r => {
            done();
        }).catch(done);
    });

    it('should get comments of a post', done => {
        CirclePost.GetComments(GetCirclePost(), user01, 10, 1).then(r => {
            expect(r).to.have.property('comments');
            expect(r.comments.length).to.be.greaterThan(0);
        }).catch(done);
    });
});
