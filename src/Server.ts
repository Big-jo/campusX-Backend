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
import { runSeeds } from './seeds';
import { validateEnv } from './config/env';

// Validate environment variables before starting the server
try {
  validateEnv();
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  console.error('❌ Server startup aborted due to invalid environment configuration');
  process.exit(1);
}

// Setup MongoDB
const URI = process.env.MONGO_URI as string;
console.log(URI);
mongoose.connect(URI, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

// Connection Instance
const Db = mongoose.connection;

// Flag to ensure seeds only run once per test run
let seedsHaveRun = false;

// tslint:disable-next-line: no-console
Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
Db.on('connected', async () => {
  console.log('MongoDB connected');

  // Only run seeds once in test environment, always in other environments
  if (process.env.NODE_ENV === 'test') {
    if (!seedsHaveRun) {
      await runSeeds();
      seedsHaveRun = true;
    }
  } else {
    await runSeeds();
  }
});

// Drop tasks collection at every startup since it causes issues
try {
  Db.dropCollection('tasks');
} catch (e) {
  // tslint:disable-next-line:no-console
  console.log.bind(console, 'MongoDB connected');
}

const app = express();
const server = http.createServer(app);

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

app.use(cookieParser());
app.get('/', (req: Request, res: Response) => {
  res.status(NOT_FOUND).send('Oops the resource does not exist');
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
export { server };
