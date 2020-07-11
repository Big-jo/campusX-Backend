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
import * as SocketIO from 'socket.io';
import {Newsfeed} from './lib/newsfeeds';
import {NOT_FOUND} from 'http-status-codes';
import sentry from './lib/sentry';
// Setup MongoDB
const URI = process.env.MONGO_URI as string;

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
Db.on('connected', console.log.bind(console, 'MongoDB connected'));




// Init express

const app = express();
//  Setup socketIO
const server = http.createServer(app);

const io = socketIO.listen(server);
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
app.use((req, res, next) => { res.locals.socketio = io; next(); });
app.use(cookieParser());
app.get('/', (req: Request, res: Response) => {
    res.status(NOT_FOUND).send('Oops the resource does not exist');
});

app.use(BaseRouter.path, BaseRouter.router);

const newsfeed = new Newsfeed(io);

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
export { server, io};
