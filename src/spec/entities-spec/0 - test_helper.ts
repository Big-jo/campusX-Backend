// //  MongoDB Connection
// import mongoose from 'mongoose';
// import IORedis from 'ioredis';
// import { logger } from '../../shared';
//
//
// const Db = mongoose.connection;
//
// let primaryCache: IORedis.Redis;
//
// before(async () => {
//     const URI = process.env.MONGO_URI as string;
//     await mongoose.connect(URI, {
//         useNewUrlParser: true,
//         useFindAndModify: false,
//     });
//
// // tslint:disable-next-line: no-console
//     Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// // tslint:disable-next-line: no-console
//     Db.on('connected', console.log.bind(console, 'MongoDB connected'));
//
//     Db.on('disconnected', () => {
//         logger.info('disconnected mongo ')
//     });
//
// // Redis Connection
//     if (process.env.NODE_ENV === 'testing') {
//         primaryCache = new IORedis();
//     }
//
//     primaryCache.on('connect', args => {
//         logger.info('Redis Connected');
//     });
//
//     primaryCache.on('error', err => {
//         logger.error(err);
//         throw new Error(err.message);
//     });
// });
