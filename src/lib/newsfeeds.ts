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

        if (process.env.NODE_ENV === 'development') {
            this.primaryCache = new IORedis();
        } else {
            const redisPortPrimary = Number(process.env.REDIS_PORT);
            const redisPortPC = Number(process.env.REDIS_PORT_PC);
            this.primaryCache = new IORedis(redisPortPrimary, process.env.REDIS_HOST_PRIMARY, { password: process.env.REDIS_PASS_PRIMARY });
        }

        this.primaryCache.on('connect', args => {
            logger.info('Redis Connected');
        });

        this.primaryCache.on('error', err => {
            logger.error(err);
        });

        io.on('connect', async socket => {

            this.MatchSocketID(socket.id, socket.handshake.query.userID);

            socket.on('disconnect', async () => {
                this.UnMatchSocketID(socket.id, socket.handshake.query.userID);
            });

        });

        /**
         * Emitter that disperses a post to each user when a following posts
         */
        feedEmitter1.on('pull-socketIDs', (eventData) => {
            console.log(eventData.filteredIDs)
            const filteredIDs = eventData.filteredIDs;
            for (const id of filteredIDs) {
                if (id !== null) {
                    io.to(id).emit('pull', eventData.post[0]);
                }
            }
        });

    }

    /**
     * Match socketID to newsfeed in cache
     */

    /**
     * Matche socketID to its newsfeed
     *
     * @private
     * @param {string} socketID 
     * @param {string} userID
     * @memberof Newsfeed
     */
    private async MatchSocketID(socketID: string, userID: string) {
        await this.primaryCache.set(`socketID:${userID}`, socketID);
        console.log('matched');
    }

    private async UnMatchSocketID(socketID: string, userID: string) {
        await this.primaryCache.del(`socketID:${userID}`, socketID);
        console.log('disconnected');
    }

}
