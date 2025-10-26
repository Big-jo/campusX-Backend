import SocketIO = require('socket.io');
import IORedis from 'ioredis';
import { IPostOptions, Post } from '../entities/Post';
import { IPost } from '../interfaces/IPost';
import EventEmitter from 'events';
import { logger } from '@shared';
import { feedEmitter1 } from './../entities/Post';

export class Newsfeed {
    private primaryCache: IORedis.Redis;
    // private feedEmitter1 = new EventEmitter(); // Emitter for synchronization with creating post
    private feedEmitter2 = new EventEmitter();

    constructor(private io: SocketIO.Server) {
        try {

            if (process.env.NODE_ENV === 'development') {
                this.primaryCache = new IORedis({ keyPrefix: 'newsfeed:' });
            } else {
                const redisPort = Number(process.env.REDIS_PORT);
                this.primaryCache = new IORedis(redisPort, process.env.REDIS_HOST, {
                    password: process.env.REDIS_PASS,
                    keyPrefix: 'newsfeed:'
                });
            }

            this.primaryCache.on('connect', args => {
                logger.info('Newsfeed Redis Connected');
            });

            this.primaryCache.on('error', err => {
                logger.error(err);
            });

            io.on('connect', socket => {

                try {
                    this.MatchSocketID(socket.id, socket.handshake.query.userID);

                    socket.on('disconnect', async () => {
                        this.UnMatchSocketID(socket.id, socket.handshake.query.userID);
                    });

                    socket.on('get-feed', async () => {
                        const posts = await Post.GetPosts(this.primaryCache, socket.handshake.query.userID, {
                            limit: 0,
                            offset: 0,
                            mostRecent: true});
                        socket.emit('pull-feed', {result: posts});
                    });

                } catch (e) {
                    logger.error(e);
                }

            });

            /**
             * Emitter that disperses a post to each user when a following posts
             */
            feedEmitter1.on('pull-socketIDs', eventData => {
                const filteredIDs = eventData.filteredIDs;
                for (const id of filteredIDs) {
                    if (id !== null) {
                        io.to(id).emit('updated-feed', [{newPost: eventData.post[0]}]);
                    }
                }
            });
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Match socketID to newsfeed in cache
     */

    /**
     * Match socketID to its newsfeed
     *
     * @private
     * @param {string} socketID 
     * @param {string} userID
     * @memberof Newsfeed
     */
    private MatchSocketID(socketID: string, userID: string) {
        try {
            this.primaryCache.set(`socketID:${userID}`, socketID);
        } catch (e) {
            logger.error(e);
        }
    }

    private UnMatchSocketID(socketID: string, userID: string) {
        try {
            this.primaryCache.del(`socketID:${userID}`, socketID);
        } catch (error) {
            logger.error(error);
        }
    }

}
