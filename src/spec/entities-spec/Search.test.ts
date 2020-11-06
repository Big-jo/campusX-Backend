// import mongoose from 'mongoose';
// import {expect} from 'chai';
// import {describe} from 'mocha';
//
// import {User} from '../../entities/User';
// import {Post} from '../../entities/Post';
// import IORedis from 'ioredis';
// import {IPost, IComment} from '../../interfaces/IPost';
// import PostModel from '../../models/Post.model';
// import CommentModel from '../../models/Comment.model';
// import {Search} from '../../entities/Search/Search';
// import {consoleTestResultHandler} from 'tslint/lib/test';
// import {escapeRegExp} from 'tslint/lib/utils';
//
// const Db = mongoose.connection;
//
// describe('Search Functions', () => {
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
//     });
//
//     after(() => {
//         Db.close();
//     });
//
//     describe('Post Search', function() {
//         it('should search a for terms in post', (done) => {
//             const search = new Search('ofada rice');
//             search.PostSearch().then(value => {
//                 console.log(value);
//                 expect(value).to.be.an('array');
//                 done();
//             }).catch(done);
//         });
//     });
//
//     // tslint:disable-next-line:only-arrow-functions
//     describe('User Search', () => {
//
//         it('should search a user with name criteria', done => {
//             const search = new Search('Melba');
//             search.UserSearch('name').then(value => {
//                 console.log(value);
//                 expect(value).to.be.an('array');
//                 done();
//             }).catch(done);
//         });
//
//     });
// });
