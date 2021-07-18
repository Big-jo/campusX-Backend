import chai from 'chai';
import mongoose from 'mongoose';
import {expect} from 'chai';
import {describe} from 'mocha';
import {Post} from '../../entities/Post';
import IORedis from 'ioredis';
import {logger} from '../../shared';
import {IPost, IComment, IUser} from '../../interfaces';
import PostModel from '../../models/Post.model';
import CommentModel from '../../models/Comment.model';
import faker from 'faker';
import UserModel from '../../models/User.model';
import {GeneratePost, GenerateUsers, GetUsers} from './util';
import {error} from 'winston';

const Db = mongoose.connection;

let user01: string;
let user02: string;

let mockedPosts: IPost[];

let primaryCache: IORedis.Redis;

Db.on('disconnected', () => {
    logger.info('disconnected mongo ');
});

describe('Posts Tests', function() {
    this.timeout(20000);
    before(() => {
        //  MongoDB Connection

        // tslint:disable-next-line: no-console
        Db.on('error', console.error.bind(console, 'MongoDB connection error'));
        // tslint:disable-next-line: no-console
        Db.on('connected', console.log.bind(console, 'MongoDB connected'));

        // Redis Connection

        primaryCache = new IORedis();

        primaryCache.on('connect', (args) => {
            logger.info('Redis Connected');
        });

        primaryCache.on('error', (err) => {
            logger.error(err);
            throw new Error(err.message);
        });

        const URI = process.env.MONGO_URI as string;
        return mongoose.connect(URI, {
            useNewUrlParser: true,
            useFindAndModify: false,
        }).then(value => {});
    });

    after(() => {
        primaryCache.quit().then(r =>  console.log('Redis Connection Closed'));
        return mongoose.disconnect().then(value => {
            console.log('disconnected');
        }).catch(reason => {
            console.error('reason');
        });
    });


    describe('Post Tests', function() {
        it('Create a post', async () => {
           try {
               const [post] =  await GeneratePost(1);
               await Post.CreatePost(post, post.author, primaryCache, { campusReflect: true});
               const result = await PostModel.findOne({text: post.text}).exec();
               expect(result).to.have.property('text');
               expect(result).to.have.property('author');
               expect(result).to.have.property('createdAt');
           } catch (e) {
               console.error(e);
           }
        });

        describe('Post Interaction', () => {
            // TODO: Create function to check if a user has liked a post
            describe('Post Operations', function() {
                it('Like a post', async () => {
                    try {
                        const post = await PostModel.find().sort({_id: 1}).lean().exec();
                        const result = await Post.LikePost(
                            user01,
                            post._id,
                            'post',
                            primaryCache,
                            null,
                        );
                        expect(result).to.be('string');
                        expect(result).to.have.property('result');
                        expect(result.result).to.equal('liked');
                    } catch (error) {
                        logger.error(error);
                    }
                });

                // it('should mention user in a post', async () => {
                //     const [post] =  await GeneratePost(1);
                //
                //     await Post.CreatePost(post, post.author, primaryCache, {
                //         campusReflect: false,
                //     });
                // });
            });

            describe('Comment Operations', function() {
                it('Comment on a post', async () => {
                    try {
                        const [post] = await PostModel.find().sort({_id: 1}).lean().exec();
                        GenerateUsers(1);
                        const [[user]] = await GetUsers(1);

                        const userID = user.id;
                        const tag = user.userTag;
                        const profileImage = user.userProfile.avatar;
                        const commentObject = {
                            campus: 'Bells University Of Technology',
                            parentPost: post.id,
                            userTag: tag,
                            author: userID,
                            text: faker.lorem.lines(2),
                            authorAvatar: profileImage,
                            type: 'comment',
                        } as IComment;
                        // tslint:disable-next-line:max-line-length
                        await Post.Comment(
                            commentObject,
                            'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM',
                            primaryCache,
                        );
                        const comment = await CommentModel.findOne({text: commentObject.text});
                        expect(comment.text).to.equal(commentObject.text);
                    } catch (e) {
                        console.error(e);
                    }
                });

                it('Get Comments', async () => {
                    const post = await PostModel.find().sort({_id: 1}).lean().exec();

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

                // it('should reply a comment', async () => {
                //     const comment = await CommentModel.find().sort({_id: 1}).lean().exec();
                //     GenerateUsers(1);
                //     const [[user]] = await GetUsers(1);
                //     const userID = user.id;
                //     const tag = user.userTag;
                //     const profileImage = user.userProfile.avatar;
                //     const commentObject = {
                //         campus: 'Bells University Of Technology',
                //         parentPost: comment[0]._id,
                //         userTag: tag,
                //         author: userID,
                //         text: faker.lorem.lines(2),
                //         authorAvatar: profileImage,
                //         type: 'reply',
                //     } as IComment;
                //     // tslint:disable-next-line:max-line-length
                //     await Post.Comment(
                //         commentObject,
                //         'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM',
                //         primaryCache
                //     );
                // });

                // it('should mention user in a comment', async () => {
                //     const post = await PostModel.find().sort({_id: 1}).lean().exec();
                //     const user = await GenerateUsers(2);
                //     const user01ID = user[0][0].id;
                //     const user02Tag = user[0][0].userTag;
                //
                //     const commentObject = {
                //         campus: 'Bells University Of Technology',
                //         parentPost: post[0]._id,
                //         userTag: user[0][0].userTag,
                //         author: user01ID,
                //         text: `${user02Tag} ${faker.lorem.sentences(10)}`,
                //         authorAvatar: 'profileImage',
                //         type: 'comment',
                //     } as IComment;
                //
                //     // tslint:disable-next-line:max-line-length
                //     await Post.Comment(
                //         commentObject,
                //         'dTNOlFafRyKLFf-VfMq_uj:APA91bGOShgvb-OudwFy3QeLoUsQprm1OjMNGe29825YTqS-0qIELtba37pbZuXjT3c6VoAWDZrUI-gKR084K2-s_jOUNvZxpx9zlIsJ6CR6jBEVPaFdr264PjkG-0qAik0yNWU1wlzM',
                //         primaryCache
                //     );
                // });
            });
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
