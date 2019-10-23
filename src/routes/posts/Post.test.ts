import chai from 'chai';
import chaiHttp from 'chai-http';
import Server from '../../Start';
import { CREATED } from 'http-status-codes';
import { IUser } from 'src/interfaces/IUser';
import UserModel from 'src/models/User.model';
import followers from 'src/models/Follow.model';
import following from 'src/models/Following.model';

const should = chai.should();

chai.use(chaiHttp);
