import cookieParser from 'cookie-parser';
import express from 'express';
import {
    Request,
    Response,
} from 'express';
import logger from 'morgan';
import path from 'path';
import mongoose, { Collection } from 'mongoose';
import BaseRouter from './routes/Base';
import session = require('express-session');
import connectMongo from 'connect-mongo';
import uuid from 'uuid';
import cors from 'cors';
import socketIO from 'socket.io';
import {
    Server,
    createServer,
} from 'http';
import {
    Campus,
} from './controllers/campuses';
import { DBRef } from 'bson';


// Setup MongoDB
const URI = process.env.MONGO_URI as string;

mongoose.connect(URI, {
    useNewUrlParser: true,
    useFindAndModify: false,
});

// Connection Instance
const Db = mongoose.connection;

// tslint:disable-next-line: no-console
Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
Db.on('connected', console.log.bind(console, 'MongoDB connected'));
// Load campuses into DB
Campus();

// Init express
const app = express();
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
// Setup socket.io
const server: Server = createServer(app);
const io = socketIO.listen(server);

// Add middleware/settings/routes to express.
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(BaseRouter.path, BaseRouter.router);

/**
 * Point express to the 'views' directory. If you're using a
 * single-page-application framework like react or angular
 * which has its own development server, you might want to
 * configure this to only serve the index file while in
 * production mode.
 */
// const viewsDir = path.join(__dirname, 'views');
// app.set('views', viewsDir);
// const staticDir = path.join(__dirname, 'public');
// app.use(express.static(staticDir));
app.get('*', (req: Request, res: Response) => {
    res.send('Oops the resource does not exist');
});

// Export express instance
export default server;
