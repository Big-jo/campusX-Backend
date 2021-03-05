import chai from 'chai';
import mongoose from 'mongoose';
import { expect } from 'chai';
import { describe } from 'mocha';
import { User } from '../../entities/User';
import { Post } from '../../entities/Post';
import IORedis from 'ioredis';
import { logger } from '../../shared';
import {IPost, IComment, IUser} from '../../interfaces';
import PostModel from '../../models/Post.model';
import CommentModel from '../../models/Comment.model';
import faker from 'faker';
import UserModel from '../../models/User.model';

const Db = mongoose.connection;

let user01: string;
let user02: string;

let mockedPosts: IPost[];

let primaryCache: IORedis.Redis;

async function GenerateUsers(numberOfUsers: number) {
    let x = 0;
    const generated = [];
    while (x < numberOfUsers) {
        generated.push(await UserModel.find().limit(1).exec());
        x++;
    }
    return generated;
}


Db.on('disconnected', () => {
    logger.info('disconnected mongo ');
})

before(async () => {

    //  MongoDB Connection
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
        useNewUrlParser: true,
        useFindAndModify: false,
    })

    // tslint:disable-next-line: no-console
    Db.on('error', console.error.bind(console, 'MongoDB connection error'));
    // tslint:disable-next-line: no-console
    Db.on('connected', console.log.bind(console, 'MongoDB connected'));

    // Redis Connection
    if (process.env.NODE_ENV === 'development') {
        primaryCache = new IORedis();
    }

    primaryCache.on('connect', args => {
        logger.info('Redis Connected');
    });

    primaryCache.on('error', err => {
        logger.error(err);
        throw new Error(err.message);
    });

    const users = [
        {
            name: `${faker.name.firstName(1)} ${faker.name.lastName(1)}`,
            userTag: faker.internet.userName(),
            email: faker.internet.email(),
            password: '111',
            userProfile: {
                bio: faker.lorem.sentence(10),
                gender: 'male',
                university: 'Bells University Of Technology',
                avatar: 'https://picsum.photos/200/300',
            },
        },
        {
            name: `${faker.name.firstName(0)} ${faker.name.lastName(0)}`,
            userTag: faker.internet.userName(),
            email: faker.internet.email(),
            password: '111',
            userProfile: {
                bio: faker.lorem.sentence(10),
                gender: 'male',
                university: 'Bells University Of Technology',
                avatar: 'https://picsum.photos/200/300',
            },
        },
    ] as IUser[];

    await User.CreateUser(users[0]);
    await User.CreateUser(users[1]);

    const [x, y] = await GenerateUsers(2);
    // console.log(x, y);

    user01 = x[0]._id;
    user02 = y[0]._id;


    // const user = [
    //     {
    //         name: `${faker.name.firstName(1)} ${faker.name.lastName(1)}`,
    //         userTag: faker.internet.userName(),
    //         email: faker.internet.email(),
    //         password: '111',
    //         userProfile: {
    //             bio: faker.lorem.sentence(10),
    //             gender: 'male',
    //             university: 'Bells University Of Technology',
    //             avatar: 'https://picsum.photos/200/300',
    //         },
    //     },
    //     {
    //         name: `${faker.name.firstName(0)} ${faker.name.lastName(0)}`,
    //         userTag: faker.internet.userName(),
    //         email: faker.internet.email(),
    //         password: '111',
    //         userProfile: {
    //             bio: faker.lorem.sentence(10),
    //             gender: 'male',
    //             university: 'Bells
});

after(done => {
    primaryCache.quit();
    return mongoose.disconnect(done);
});

describe('Post Interaction',  () => {
    // tslint:disable-next-line:no-shadowed-variable

    mockedPosts = [{
        campus: faker.company.companyName(),
        author: user01,
        text: faker.lorem.sentences(10),
    }, {
        campus: faker.company.companyName(),
        author: user02,
        text: faker.lorem.sentences(10),
    }] as IPost[];
    // UserModel.find().sort({ _id: 1 }).lean().exec().then(x => {
    //     try{
    //         user01 = x[0]._id;
    //         user02 = x[1]._id;
    //         mockedPosts = [{
    //             campus: faker.company.companyName(),
    //             author: user01,
    //             text: faker.lorem.sentences(10),
    //         }, {
    //             campus: faker.company.companyName(),
    //             author: user02,
    //             text: faker.lorem.sentences(10),
    //         }] as IPost[];
    //     } catch (e) {
    //         logger.error(e);
    //     }
    // });

    it('Create two posts for each user', async () => {
        await Post.CreatePost(mockedPosts[0], mockedPosts[0].author, primaryCache);
    });

    // TODO: Create function to check if a user has liked a post
    it('Like a post', async () => {
        try {
            const post = await PostModel.find().sort({ _id: 1 }).lean().exec();
            const result = await Post.LikePost(user01, post._id, 'post', primaryCache, null);
            expect(result).to.be('string');
            expect(result).to.have.property('result');
            expect(result.result).to.equal('liked');
        } catch (error) {
            logger.error(error);
        }
    });

    it('should mention user in a post', async () => {

        const postObject = {
                campus: faker.company.companyName(),
                author: user01,
                text: ` ${user02} ${faker.lorem.sentences(10)}`,
            } as IPost;

        await Post.CreatePost(postObject, mockedPosts[0].author, primaryCache);
    });

    describe('Comment Operations', () => {
        it('Comment on a post', async () => {
            const post = await PostModel.find().sort({_id: 1}).lean().exec();
            const user = await GenerateUsers(1);
            const userID = user[0][0].id;
            const tag = user[0][0].userTag;
            const profileImage = user[0][0].userProfile.avatar;
            const commentObject = {
                campus: 'Bells University Of Technology',
                parentPost: post[0]._id,
                userTag: tag,
                author: userID,
                text: faker.lorem.lines(2),
                authorAvatar: profileImage,
                type: 'comment'
            } as IComment;
            // tslint:disable-next-line:max-line-length
            await Post.Comment(commentObject, 'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM', primaryCache);
        });

        it('Get Comments', async () => {
            const post = await PostModel.find().sort({ _id: 1 }).lean().exec();

            const result = await Post.GetComments(post[0]._id, user01, 10, 1);
            expect(result).to.have.property('comments');
            expect(result.comments[0]).to.have.property('createdAt');
            expect(result.comments[0]).to.have.property('author');
            expect(result.comments[0]).to.have.property('video');
            expect(result.comments[0]).to.have.property('image');
            expect(result.comments[0]).to.have.property('text');
            expect(result.comments[0]).to.have.property('parentPost');
            expect(result.comments[0]).to.have.property('isLiked');
        });
        
        // it('should like a comment', async () => {
        //     const comment = await  CommentModel.find().sort({_id: 1}).exec();
        //     await Post.LikePost(user01, comment[0]._id, 'comment', primaryCache, null);
        // });

        it('should reply a comment', async () => {
            const comment = await CommentModel.find().sort({ _id: 1 }).lean().exec();
            const user = await GenerateUsers(1);
            const userID = user[0][0].id;
            const tag = user[0][0].userTag;
            const profileImage = user[0][0].userProfile.avatar;
            const commentObject = {
                campus: 'Bells University Of Technology',
                parentPost: comment[0]._id,
                userTag: tag,
                author: userID,
                text: faker.lorem.lines(2),
                authorAvatar: profileImage,
                type: 'reply',
            } as IComment;
            // tslint:disable-next-line:max-line-length
            await Post.Comment(commentObject, 'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM', primaryCache);
        });

        it('should mention user in a comment', async () => {
            const post = await PostModel.find().sort({ _id: 1 }).lean().exec();
            const user = await GenerateUsers(2);
            const user01ID = user[0][0].id;
            const user02Tag = user[0][0].userTag;

            const commentObject = {
                campus: 'Bells University Of Technology',
                parentPost: post[0]._id,
                userTag: user[0][0].userTag,
                author: user01ID,
                text: `${user02Tag} ${faker.lorem.sentences(10)}`,
                authorAvatar: 'profileImage',
                type: 'comment',
            } as IComment;

            // tslint:disable-next-line:max-line-length
            await Post.Comment(commentObject,'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM' , primaryCache);
        });
    });
});

// describe('User Feed ', () => {
//     it('Get User Feed', async () => {
//         const user = await GenerateUsers(1);
//         const userID = user[0][0].id;
//
//         const result = await Post.GetPosts(primaryCache, userID, { mostRecent: true, limit: 50, offset: 1 });
//         expect(result).to.have.property('newsfeed');
//         expect(result.newsfeed).to.be.an('array');
//         expect(result.newsfeed[0]).to.have.property('createdAt');
//         expect(result.newsfeed[0]).to.have.property('author');
//         expect(result.newsfeed[0]).to.have.property('video');
//         expect(result.newsfeed[0]).to.have.property('image');
//         expect(result.newsfeed[0]).to.have.property('text');
//         expect(result.newsfeed[0]).to.have.property('likes');
//         expect(result.newsfeed[0]).to.have.property('dislikes');
//         expect(result.newsfeed[0]).to.have.property('campus');
//         expect(result.newsfeed[0]).to.have.property('isLiked');
//     });
// });
