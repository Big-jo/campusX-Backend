"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cookie_parser_1 = tslib_1.__importDefault(require("cookie-parser"));
const express_1 = tslib_1.__importDefault(require("express"));
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const path_1 = tslib_1.__importDefault(require("path"));
const mongoose_1 = tslib_1.__importDefault(require("mongoose"));
const Base_1 = tslib_1.__importDefault(require("./routes/Base"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const socket_io_1 = tslib_1.__importDefault(require("socket.io"));
const http_1 = require("http");
const campuses_1 = require("./controllers/campuses");
const URI = process.env.MONGO_URI;
mongoose_1.default.connect(URI, {
    useNewUrlParser: true,
    useFindAndModify: false,
});
const Db = mongoose_1.default.connection;
Db.on('error', console.error.bind(console, 'MongoDB connection error'));
Db.on('connected', console.log.bind(console, 'MongoDB connected'));
campuses_1.Campus();
const app = express_1.default();
app.use(cors_1.default());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
const server = http_1.createServer(app);
const io = socket_io_1.default.listen(server);
app.use(morgan_1.default('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({
    extended: true,
}));
app.use(cookie_parser_1.default());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use(Base_1.default.path, Base_1.default.router);
app.get('*', (req, res) => {
    res.send('Oops the resource does not exist');
});
exports.default = server;
