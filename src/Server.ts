import cookieParser from 'cookie-parser';
import express from 'express';
import { Request, Response } from 'express';
import logger from 'morgan';
import path from 'path';
import BaseRouter from './routes/Base';
import mongoose from 'mongoose';
import session = require('express-session');
import connectMongo from 'connect-mongo';
import uuid from 'uuid';

// Create mongo store
const mongoDBStore = connectMongo(session);
// Setup MongoDB
const URI = 'mongodb://localhost:27017/campusX';

mongoose.connect(URI, {useNewUrlParser: true});

// Connection Instance
const Db = mongoose.connection;
// Bind connection to error event

// tslint:disable-next-line: no-console
Db.on('error', console.error.bind(console, 'MongoDB connection error'));
// tslint:disable-next-line: no-console
Db.on('connected', console.log.bind(console, 'MongoDB connected'));

// Init express
const app = express();

// Add middleware/settings/routes to express.
app.use(logger('dev'));
app.use(session({
    genid: () => uuid(),
    secret: process.env.SESSION_SECRET as string,
    store:  new mongoDBStore({mongooseConnection: Db}),
    resave: false,
    saveUninitialized: false,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
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
const viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));
app.get('*', (req: Request, res: Response) => {
    res.send('HII');
});

// Export express instance
export default app;
