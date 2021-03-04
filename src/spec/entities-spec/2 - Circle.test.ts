// tslint:disable-next-line:no-console

import chai from 'chai';
import mongoose from 'mongoose';
// tslint:disable-next-line:import-spacing
import { expect } from 'chai';

import { Circle } from '../../entities/Circles/Circle';
import { ICircle } from '../../interfaces/ICircle';
import {ICirclePost} from '../../interfaces/ICirclePost';
import { CirclePost } from '../../entities/Circles/CirclePost';
import CircleModel from '../../models/Circle.model';
import { User } from '../../entities/User';
import faker from 'faker';
import CircleMemberModel from '../../models/CircleMember.model';
import CirclePostModel from '../../models/CirclePost.model';
import UserModel from 'src/models/User.model';

let user01: string;

async function GenerateUsers(numberOfUsers: number) {
    let x = 0;
    const generated = [];
    while (x < numberOfUsers) {
        generated.push(await UserModel.find().limit(1).exec());
        x++;
    }
    return generated;
}

async function GetCircle() {
    let circle;
    circle = await CircleModel.findOne({}).limit(1).sort({$natural: -1}).exec();
    return circle._id;
}

async function GetMemberID() {
    let memberID;
    memberID = await CircleMemberModel.findOne({circle: await GetCircle(), userID: user01}).exec();
    return memberID._id;
}

async function GetCirclePost() {
    let postID;
    postID = await CirclePostModel.findOne({circleID: await GetCircle(), userID: user01}).exec();
    return postID._id;
}

const Db = mongoose.connection;

before(async () => {
    const URI = process.env.MONGO_URI as string;

    mongoose.set('useUnifiedTopology', true);
    mongoose.set('useCreateIndex', true);

    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
        // useUnifiedTopology: true,
    });

    // tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
    // tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));

    // await Db.dropCollection('circles');
    // await Db.dropCollection('circlemembers');
    // await Db.dropCollection('circles');

    // Get A UserID
    user01 = (await GenerateUsers(1))[0][0].id;
});

after(() => {
    Db.dropCollection('circlemembers');
    Db.close();
});

describe('Circle Tests', () => {

    it('should create a circle', async () => {
        const circleObject = {
            avatar: faker.image.avatar(),
            description: faker.lorem.words(5),
            name: faker.company.companyName(),
        } as ICircle;
        await Circle.Create(circleObject, user01);
    });

    it('should join a circle', async () => {
        // Get A CircleID
        const circleID = await GetCircle();
        const value = await Circle.Join(user01, circleID.toString());
        expect(value).to.have.property('memberID');
        expect(value.memberID).to.be.a('string');
    });

    // it('should leave circe', done => {
    //     Circle.Leave(GetCircle(), user01).then((value: any) => {
    //         expect(value).to.equal(0);
    //         done();
    //     }).catch(done);
    // });

    it('should get circles with 10 items first', done => {
        Circle.GetCircles(0).then(value => {
            expect(value.circles.length).to.be.greaterThan(0);
            done();
        }).catch(done);
    });

    describe('Circle Post Feed', () => {

        it('should create circle posts', async () => {

            const circlePost: ICirclePost = {
                campus: faker.company.companyName(),
                circleID: await GetCircle(),
                memberID: await GetMemberID(),
                author: user01,
                text: faker.lorem.sentences(10),
                parentPost: '',
            };

            await CirclePost.CirclePost(circlePost, undefined);
        });

        it('should get feed from circle ', async () => {
            const value = await Circle.GetCircleFeed((await GetCircle()), user01, 1, 10);

            expect(value).to.have.property('circleFeed');
            expect(value.circleFeed).to.be.an('array');
            expect(value.circleFeed.length).to.be.greaterThan(0);
        });

        // it('should like a post', async () => {
        //     const r = await CirclePost.LikePost(user01, (await GetCirclePost()), 'circlePost');
        //
        // });

        // it('should comment on a post', async () => {
        //     const circlePost: ICircleComment = {
        //         campus: faker.company.companyName(),
        //         circleID: circle01ID,
        //         memberID: member01ID,
        //         author: user01,
        //         text: faker.lorem.sentences(10),
        //         parentPost: circlePostID,
        //     };
        //
        //     await CirclePost.Comment(circlePost);
        // });
        //
        // it('should get comments of a post', async () => {
        //     const r = await CirclePost.GetComments(await GetCirclePost(), user01, 10, 1);
        //     expect(r).to.have.property('comments');
        //     expect(r.comments.length).to.be.greaterThan(0);
        // });
    });
});
