import SocketIO = require('socket.io');
import IORedis from 'ioredis';
import {IPostOptions, Post} from '../entities/Post';
import {IPost} from '../interfaces/IPost';
import EventEmitter from 'events';
import {logger} from '@shared';
import {isNegativeNumberLiteral} from 'tslint';

export class Newsfeed {
    private primaryCache: IORedis.Redis;
    private postCache: IORedis.Redis;
    private feedEmitter1 = new EventEmitter(); // Emitter for synchronization with creating post
    private feedEmitter2 = new EventEmitter();

    constructor(private io: SocketIO.Server) {

        if (process.env.NODE_ENV === 'development') {
            this.primaryCache = new IORedis();
            this.postCache = new IORedis({port: 6380});
        } else {
            const redisPortPrimary = Number(process.env.REDIS_PORT);
            const redisPortPC = Number(process.env.REDIS_PORT_PC);
            this.primaryCache = new IORedis(redisPortPrimary, process.env.REDIS_HOST_PRIMARY, {password: process.env.REDIS_PASS_PRIMARY});
            this.postCache = new IORedis(redisPortPC, process.env.REDIS_HOST_PC, {password: process.env.REDIS_PASS_PC});

        }

        this.primaryCache.on('connect', args => {
            logger.info('Redis Connected');
        });

        this.primaryCache.on('error', err => {
            logger.error(err);
        });

        io.on('connect', async socket => {
            const userID = socket.handshake.query.userID;

            if (await this.primaryCache.exists(userID)) {
                this.MatchSocketID(socket.id, userID);
            }

            /**
             * Return feed to user on connect;
             */

            this.GetNewsFeed(socket.handshake.query.userID);

            /**
             * Return feed to the user on request
             */
            socket.on('get-feed', args => {
                this.GetNewsFeed(socket.handshake.query.userID);
            });
        });

        /**
         * Emitter that disperses a post to each user when a following posts
         */
        this.feedEmitter1.on('pull-updated-feed', async newsfeedUpdates => {
            for (const update of newsfeedUpdates) {
                const newPost = update.newPostID as string;
                const newsfeed = await this.primaryCache.lindex(update.updatedHash, 0);
                const socketID = newsfeed[1] as string;
                const retrivedPost = newsfeed[0];

                if (socketID !== undefined) {
                    io.to(socketID).emit('pull-updated-feed', retrivedPost);
                }
            }
        });

        /**
         * Emitter for feed that is request for immediately when connected
         */
        this.feedEmitter2.on('pull-feed', async newsfeed => {
            // socket.broadcast.to(newsfeed.socketID).emit('newsfeed', newsfeed);
            if (newsfeed.socketID !== undefined) {
                io.to(newsfeed.socketID).emit('newsfeed', newsfeed);
            }
        });
    }

    public async ConstructNewsFeed(postObject: IPost, userID: string, options: IPostOptions) {
        try {
            const result = await Post.CreatePost(postObject, userID, this.primaryCache, this.postCache, options);
            if (result !== undefined) {
                this.feedEmitter1.emit('pull-updated-feed', result.updatedFeeds);
            }
            if (result!.opsValue === 0) {
                return 0;
            }

        } catch (e) {
            throw new Error(e);
        }

    }

    /**
     * Match socketID to newsfeed in cache
     */

    public async GetNewsFeed(userID: string) {
        const result = await Post.GetPosts(this.primaryCache, this.postCache, userID, {mostRecent: true});

        if (result !== undefined) {
            this.feedEmitter2.emit('pull-feed', result.newsfeed);
        } else {
            logger.info('undefined');
        }
        return 0;
    }

    /**
     * Matches a socketID to its newsfeed
     *
     * @private
     * @param {string} socketID 
     * @param {string} userID
     * @memberof Newsfeed
     */
    private async MatchSocketID(socketID: string, userID: string) {
        await this.primaryCache.lset(userID, 0, socketID);
    }

}
