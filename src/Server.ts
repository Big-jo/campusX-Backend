import cookieParser from 'cookie-parser';
import express from 'express';
import {
  Request,
  Response,
} from 'express';
import logger from 'morgan';
import mongoose, { Collection } from 'mongoose';
import BaseRouter from './routes/Base';
import cors from 'cors';
import * as socketIO from 'socket.io';
import * as http from 'http';
import { Newsfeed } from './lib/newsfeeds';
import { NOT_FOUND } from 'http-status-codes';
import sentry from './lib/sentry';
import IORedis from 'ioredis';
import { Chat } from './entities/Chat/Chat';

import { CircleConversation } from './lib/circle-conversation';
import { runSeeds } from './seeds';

// Setup MongoDB
const URI = process.env.MONGO_URI as string;
console.log(URI);
mongoose.connect(URI, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

// Connection Instance
const Db = mongoose.connection;

// tslint:disable-next-line: no-console
Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
Db.on('connected', async () => {
  console.log('MongoDB connected');
  await runSeeds();
});

// Drop tasks collection at every startup since it causes issues
try {
  Db.dropCollection('tasks');
} catch (e) {
  // tslint:disable-next-line:no-console
  console.log.bind(console, 'MongoDB connected');
}

/******************************************************************************
 *                                 SETUP REDIS
 /******************************************************************************/

let primaryCache: IORedis.Redis;

if (process.env.NODE_ENV === 'development') {
  primaryCache = new IORedis();
} else {
  const redisPort = Number(process.env.REDIS_PORT);
  primaryCache = new IORedis(redisPort, process.env.REDIS_HOST, { password: process.env.REDIS_PASS });
}

primaryCache.on('connect', args => {
  console.log.bind(console, 'Redis Instance Connected');
});

primaryCache.on('error', err => {
  console.log.bind(console, err);
});


// Init express

const app = express();
//  Setup socketIO
const server = http.createServer(app);

const io = socketIO.listen(server, { path: '/timeline' });
const cirleIO = socketIO.listen(server, { path: '/circle-conversations' });
const chatIO = socketIO.listen(server, { path: '/chat' });
new Newsfeed(io);
new CircleConversation(cirleIO)
// new Chat(chatIO, primaryCache);

// Handle Websockets
// io.of('/get-newsfeed').on('connection', (socket: any) => {
//     console.log(socket.id);
// });

app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add middleware/settings/routes to express.
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true,
}));
// app.use((req, res, next) => {
//     // res.locals.socketio = io;
//     // res.locals.newsfeed = newsfeed;
//     next();
// });
app.use(cookieParser());
app.get('/', (req: Request, res: Response) => {
  res.status(NOT_FOUND).send('Oops the resource does not exist');
});

// Add to redis connection to req object
app.use((req, res, next) => {
  // res.locals.socketio = io;
  // res.locals.newsfeed = newsfeed;
  res.locals.primaryCache = primaryCache;
  next();
});

app.use(BaseRouter.path, BaseRouter.router);
app.use(BaseRouter.v2.path, BaseRouter.v2.router);


app.use(sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

// Optional fallthrough error handler
app.use(function onError(err: any, req: any, res: any, next: any) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  console.log(err.message);
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});




// Export express instance
export { server, io };
