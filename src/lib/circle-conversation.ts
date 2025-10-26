import SocketIO = require('socket.io');
import IORedis from 'ioredis';
import { IPostOptions, Post } from '../entities/Post';
import { IPost } from '../interfaces/IPost';
import EventEmitter from 'events';
import { logger } from '@shared';
import { feedEmitter1 } from './../entities/Post';
import { IConversationMessage } from 'src/entities/Circles/CircleConversations';
import { Emitter } from '../entities/Circles/CircleConversations';
import { CircleConversation as CConversation } from "../entities/Circles/CircleConversations";

export class CircleConversation {
    private primaryCache: IORedis.Redis;

    constructor(private io: SocketIO.Server) {
        try {

            if (process.env.NODE_ENV === 'development') {
                this.primaryCache = new IORedis({ keyPrefix: 'circle:' });
            } else {
                const redisPort = Number(process.env.REDIS_PORT);
                this.primaryCache = new IORedis(redisPort, process.env.REDIS_HOST, {
                    password: process.env.REDIS_PASS,
                    keyPrefix: 'circle:'
                });
            }

            this.primaryCache.on('connect', args => {
                logger.info('Circle Conversation Redis Connected');
            });

            this.primaryCache.on('error', err => {
                logger.error(err);
            });

            io.on('connect', socket => {

                try {
                    const userID = socket.handshake.query.userID;
                    this.MatchSocketID(socket.id, userID);

                    socket.on('disconnect', async () => {
                        this.UnMatchSocketID(socket.id, userID);
                    });

                    socket.on('send-message', async (conversationMessage: IConversationMessage) => {
                        const circleConversation = new CConversation(this.primaryCache, userID);
                        circleConversation.sendMessage(conversationMessage);
                        io.emit(`${conversationMessage.conversationID}`, conversationMessage)
                    })
                    
                } catch (e) {
                    logger.error(e);
                }

            });

        } catch (e) {
            logger.error(e);
        }
    }


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
            this.primaryCache.set(`socketID:circle:${userID}`, socketID);
        } catch (e) {
            logger.error(e);
        }
    }

    private UnMatchSocketID(socketID: string, userID: string) {
        try {
            this.primaryCache.del(`socketID:circle:${userID}`, socketID);
        } catch (error) {
            logger.error(error);
        }
    }

}
