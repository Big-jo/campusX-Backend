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
            logger.info('Redis Connected, Trending');
        });

        this.redis.on('error', err => {
            logger.error(err);
        });
    }

    public TrendTask() {
        // this.agenda.define('Calculate Trending', async job => {
        //     try {
        //         // const posts = await PostModel.find({ createdAt: { $gte: new Date().getTime() - (2 * 60 * 60 * 1000) } }).exec();
        //         const posts = await PostModel.find({}).exec();
        //         const trend = new Trend(posts).GenerateTrend();
        //
        //         // cache results
        //         const pipeline = this.redis.pipeline();
        //
        //         Object.keys(trend).forEach(key => {
        //             // console.log(key, trend[key]);
        //             // console.log('key');
        //             const currentTrendElement = trend[key];
        //             const campus = key;
        //             for (let index = 0; index < (currentTrendElement.length > 5 ? 5 : currentTrendElement.length); index++) {
        //                 const element = currentTrendElement[index];
        //                 pipeline.zadd(`campusesTrends:${campus}`, `${element.count.toString()}`, element.keyword);
        //             }
        //         });
        //
        //         pipeline.exec();
        //     } catch (error) {
        //         logger.error(error);
        //     }
        // });
        //
        // this.agenda.on('ready', () => {
        //     this.agenda.start();
        //     this.agenda.every('30 minutes', 'Calculate Trending');
        // });
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
