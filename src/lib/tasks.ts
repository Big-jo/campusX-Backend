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
    private postCache: IORedis.Redis;

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
            this.postCache = new IORedis({ port: 6379 });
        } else {
            const redisPortPrimary = Number(process.env.REDIS_PORT_PRIMARY);
            const redisPortPC = Number(process.env.REDIS_PORT_PC);

            this.postCache = new IORedis(redisPortPC, process.env.REDIS_HOST_PC, { password: process.env.REDIS_PASS_PC });
        }

        this.postCache.on('connect', args => {
            logger.info('Redis Connected, Trending');
        });

        this.postCache.on('error', err => {
            logger.error(err);
        });
    }

    public TrendTask() {
        this.agenda.define('Calculate Trending', async job => {
            try {
                // const posts = await PostModel.find({ createdAt: { $gte: new Date().getTime() - (2 * 60 * 60 * 1000) } }).exec();
                const posts = await PostModel.find({}).exec();
                const trend = new Trend(posts).GenerateTrend();

                // cache results 
                const pipeline = this.postCache.pipeline();

                Object.keys(trend).forEach(key => {
                    // console.log(key, trend[key]);
                    // console.log('key');
                    const currentTrendElement = trend[key];
                    const campus = key;
                    for (let index = 0; index < (currentTrendElement.length > 5 ? 5 : currentTrendElement.length); index++) {
                        const element = currentTrendElement[index];
                        pipeline.zadd(`campusesTrends:${campus}`, `${element.count.toString()}`, element.keyword);
                    }
                });

                pipeline.exec();
            } catch (error) {
                logger.error(error);
            }
        });

        this.agenda.on('ready', () => {
            this.agenda.start();
            this.agenda.every('30 minutes', 'Calculate Trending');
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
