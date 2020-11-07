// import chai from 'chai';
// import mongoose from 'mongoose';
// import { expect } from 'chai';
// import { describe } from 'mocha';
//
// import { User } from '../../entities/User';
// import { Post } from '../../entities/Post';
// import IORedis from 'ioredis';
// import { logger } from '../../shared';
// import { IPost, IComment } from '../../interfaces/IPost';
// import PostModel from '../../models/Post.model';
// import CommentModel from '../../models/Comment.model';
// import faker from 'faker';
//
// const Db = mongoose.connection;
//
// let user01: string;
// let user02: string;
// let comment01: any;
//
// let mockedPosts: IPost[];
//
// let primaryCache: IORedis.Redis;
// let postCache: IORedis.Redis;
//
// let mockedPostsLength;
//
// describe('Posts', () => {
//     let post01: any;
//
//     before(async () => {
//
//         //  MongoDB Connection
//         const URI = process.env.MONGO_URI as string;
//         await mongoose.connect(URI, {
//             useNewUrlParser: true,
//             useFindAndModify: false,
//         });
//
//         // tslint:disable-next-line: no-console
//         Db.on('error', console.error.bind(console, 'MongoDB connection error'));
//         // tslint:disable-next-line: no-console
//         Db.on('connected', console.log.bind(console, 'MongoDB connected'));
//
//         // Redis Connection
//         if (process.env.NODE_ENV === 'development') {
//             primaryCache = new IORedis();
//             postCache = new IORedis({ port: 6380 });
//
//         }
//
//         // Db.dropCollection('posts');
//         // Db.dropCollection('comments');
//
//         primaryCache.on('connect', args => {
//             console.log('Redis Connected');
//         });
//
//         primaryCache.on('error', err => {
//             logger.error(err);
//             throw new Error(err.message);
//         });
//
//         user01 = await (await User.Login('doe@gmail.com', '111')).user.userID;
//         user02 = await (await User.Login('janey@gmail.com', '111')).user.userID;
//
//         PostModel.find({}).exec().then( async result => {
//             post01 = await PostModel.find({}).limit(1).sort({ $natural: -1 }).lean().exec();
//             post01 = post01[0]._id;
//         }).catch(reason => {
//
//         });
//
//         CommentModel.find({}).exec().then( async result => {
//              comment01 = await CommentModel.find({}).limit(1).sort({ $natural: -1 }).lean().exec();
//              comment01 = comment01[0]._id;
//         }).catch();
//
//         mockedPosts = [{
//             campus: faker.company.companyName(),
//             author: user01,
//             text: faker.lorem.sentences(10),
//         }, {
//             campus: faker.company.companyName(),
//             author: user02,
//             text: faker.lorem.sentences(10),
//         }] as IPost[];
//     });
//
//     after(() => {
//         Db.close();
//     });
//
//     describe('Post Functions', () => {
//
//         it('Create a two posts for each user', done => {
//
//             mockedPostsLength = mockedPosts.length;
//
//             Post.CreatePost(mockedPosts[0], mockedPosts[0].author, {name: 'POST'}, primaryCache)
//                 .then(result => {
//                     expect(result).to.equal(undefined);
//                 }).catch(done);
//
//             Post.CreatePost(mockedPosts[1], mockedPosts[1].author, {name: ''},primaryCache)
//                 .then(result => {
//                     expect(result).to.equal(undefined);
//                 }).catch(done);
//
//             done();
//
//             // done();
//         });
//
//         it('Check If Posts Are In DB', done => {
//             PostModel.find({}).exec().then(result => {
//                 expect(result.length).to.be.greaterThan(0);
//                 done();
//             }).catch(done);
//         });
//     });
//
//     describe('Post Interaction',  () => {
//         // @ts-ignore
//
//         // TODO: Create function to check if a user has liked a post
//         it('Like a post', done => {
//             Post.LikePost(user01, post01, 'post').then(result => {
//                 done();
//             }).catch(done);
//         });
//
//         describe('Comment Operations', () => {
//             it('Comment on a post', done => {
//                 const commentObject = {
//                     campus: 'Bells University Of Technology',
//                     parentPost: post01,
//                     userTag: '@janey',
//                     author: user01,
//                     text: 'First Comment',
//                     parentPostID: post01,
//                     authorAvatar: '',
//                 } as IComment;
//                 Post.Comment(commentObject, postCache).then(result => {
//                         done();
//                 }).catch(done);
//             });
//
//             it('Get Comments', done => {
//                 Post.GetComments(post01, user01, 1, 2).then(result => {
//                     console.log(result.comments);
//                     expect(result).to.have.property('comments');
//                     expect(result.comments[0]).to.have.property('createdAt');
//                     expect(result.comments[0]).to.have.property('author');
//                     expect(result.comments[0]).to.have.property('video');
//                     expect(result.comments[0]).to.have.property('image');
//                     expect(result.comments[0]).to.have.property('text');
//                     expect(result.comments[0]).to.have.property('parentPost');
//                     expect(result.comments[0]).to.have.property('isLiked');
//
//                     // console.log(result);
//                     done();
//                 }).catch(done);
//             });
//
//             it('should like a comment', done => {
//                 Post.LikePost(user01, comment01, 'comment').then(value => {
//                     done();
//                 }).catch(done);
//             });
//         });
//     });
//
//     describe('User Feed ', () => {
//         it('Get User Feed', done => {
//             Post.GetPosts(primaryCache, postCache, user01, {mostRecent: true, limit: 50, offset: 0}).then(result => {
//                 console.log(result.newsfeed);
//                 // console.log(result);
//                 expect(result).to.have.property('newsfeed');
//                 expect(result.newsfeed).to.be.an('array');
//                 expect(result.newsfeed[0]).to.have.property('createdAt');
//                 expect(result.newsfeed[0]).to.have.property('author');
//                 expect(result.newsfeed[0]).to.have.property('video');
//                 expect(result.newsfeed[0]).to.have.property('image');
//                 expect(result.newsfeed[0]).to.have.property('text');
//                 expect(result.newsfeed[0]).to.have.property('likes');
//                 expect(result.newsfeed[0]).to.have.property('dislikes');
//                 expect(result.newsfeed[0]).to.have.property('campus');
//                 expect(result.newsfeed[0]).to.have.property('isLiked');
//                 done();
//             }).catch(done);
//         });
//     });
//
// });
