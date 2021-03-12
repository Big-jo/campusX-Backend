import agenda from 'agenda';
import PostModel from '../models/Post.model';
import moment from 'moment';
import faker, { fake } from 'faker';
import { Trend } from './trends';
import IORedis from 'ioredis';
import { logger } from '@shared';

export class Tasks {
    private mongoUri: string;
    private agenda: agenda;
    private redis: IORedis.Redis;

    constructor(MongoUri: string) {
        this.mongoUri = MongoUri;
        const agendaConfig: agenda.AgendaConfiguration = {
            db: {
                address: MongoUri,
                collection: 'tasks',

            },
        };
        this.agenda = new agenda(agendaConfig);

        /******************************************************************************
         *                                 SETUP REDIS
         /******************************************************************************/

        if (process.env.NODE_ENV === 'development') {
            this.redis = new IORedis({ port: 6379 });
        } else {
            const redisPortPrimary = Number(process.env.REDIS_PORT_PRIMARY);
            const redisPortPC = Number(process.env.REDIS_PORT_PC);

            this.redis = new IORedis(redisPortPC, process.env.REDIS_HOST_PC, { password: process.env.REDIS_PASS_PC });
        }

        this.redis.on('connect', args => {
            logger.info('Redis Connected, Tasks');
        });

        this.redis.on('error', err => {
            logger.error(err);
        });
    }

    public CleanUpRedisTask() {
        this.agenda.define('Clean Campus Timeline', async job => {
            try {
                // Get Current time
                const unixNow = moment().utc().valueOf();
                logger.info(`CampusFeed Clean Up Started At ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);

                // Get campus posts to be removed
                const expiredPosts = await this.redis.zrangebyscore('campusFeedExpiry', 0, unixNow);
                this.redis.zremrangebyscore('campusFeedExpiry', 0, unixNow);

                // Filter expired posts to get the campus names
                const filterExpired = expiredPosts.map(post => {
                    return { campus: post.split(':')[0], member: post };
                });

                const pipeline = await this.redis.pipeline();
                filterExpired.forEach(filtered => pipeline.zrem(`campusFeed:${filtered.campus}`, filtered.member));

                pipeline.exec();
            } catch (e) {
                logger.error(e);
            }
        });

        this.agenda.on('ready', args => {
            this.agenda.start();
            // Extract interval to environment variable
            const interval = process.env.CAMPUS_T_CLEANUP_INTERVAL;
            this.agenda.every(interval, 'Clean Campus Timeline');
        });

    }

    public CleanUpVisitedCircles() {
        this.agenda.define('Clean Visited Circles Cache', async job => {
            try {
                // Get Current time
                const unixNow = moment().utc().valueOf();
                logger.info(`Visited Circles Clean Up Started At ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);

                // Get circles to be removed
                const expiredCircles = await this.redis.zrangebyscore('VistedCirclesExpiry', 0, unixNow);
                this.redis.zremrangebyscore('VistedCirclesExpiry', 0, unixNow);

                // Filter expired circles to get the userID and the circleID
                const filterExpired = expiredCircles.map(circle => {
                    return { userID: circle.split(':')[0], circleId: circle.split(':')[1] };
                });

                const pipeline = await this.redis.pipeline();
                filterExpired.forEach(filtered => pipeline.zrem(`visitedCircles:${filtered.userID}`, filtered.circleId));

                pipeline.exec();
            } catch (e) {
                logger.error(e);
            }
        });

        this.agenda.on('ready', args => {
            this.agenda.start();
            // Extract interval to environment variable
            const interval = process.env.VISITED_CIRCLE_CLEAN_UP_INTERVAL;
            this.agenda.every(interval, 'Clean Visited Circles Cache');
        });
    }
    // public GenerateFakePosts() {
    //     for (let index = 0; index < 100000; index++) {
    //         const post = new PostModel({
    //             authorAvatar: faker.image.imageUrl(),
    //             author: faker.random.hexaDecimal(10),
    //             userTag: faker.internet.userName(),
    //             text: faker.lorem.sentences(20),
    //             video: '',
    //             image: '',
    //             name: `${faker.name.firstName} ${faker.name.lastName}`,
    //             campus: faker.company.companyName(),
    //             createdAt: moment().valueOf(),
    //         });

    //         post.save();
    //     }
    // }
}
