import aws from 'aws-sdk';
import { logger } from '@shared';
import UserModel from '../models/User.model';
import {Circle} from '../entities/Circles/Circle';
import CircleModel from 'src/models/Circle.model';

export class S3 {
    // public Endpoint = new aws.Endpoint('ams3.digitaloceanspaces.com');
    public s3Bucket = new aws.S3({
        endpoint: 'ams3.digitaloceanspaces.com',
        accessKeyId: process.env.SPACES_ACCESS_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
    });
    public params: {
        Bucket: string;
        Key: string;
        Body: any;
        contentType: any;
        ACL: string;
    };

    /**
     * Creates an instance of S3.
     * @param {string} ID - Identifier for the file
     * @param {*} file
     * @param {string} folder
     * @memberof S3
     */
    constructor(public ID: string, public file: any, public folder: string) {

        switch (folder) {
            case 'avatars':
                this.params = {
                    Bucket: process.env.SPACES_BUCKET_AVATAR as string,
                    Key: ID,
                    Body: file.buffer,
                    contentType: file.mimetype,
                    ACL: 'public-read',
                };
                break;
            case 'image':
                this.params = {
                    Bucket: process.env.SPACES_BUCKET_IMAGE as string,
                    Key: ID,
                    Body: file.buffer,
                    contentType: file.mimetype,
                    ACL: 'public-read',
                };
                break;
            case 'video':
                this.params = {
                    Bucket: process.env.SPACES_BUCKET_VIDEO as string,
                    Key: ID,
                    Body: file.buffer,
                    contentType: file.mimetype,
                    ACL: 'public-read',
                };
                break;
            case 'expressions':
                this.params = {
                    Bucket: process.env.SPACES_BUCKET_EXPRESSIONS as string,
                    Key: ID,
                    Body: file.buffer,
                    contentType: file.mimetype,
                    ACL: 'public-read',
                };
                break;
            case 'circle-avatars':
                this.params = {
                    Bucket: process.env.SPACES_BUCKET_CIRCLE_AVATAR as string,
                    Key: ID,
                    Body: file.buffer,
                    contentType: file.mimetype,
                    ACL: 'public-read',
                };
                break;
            default:
                throw new Error('No folder chosen');
        }

    }

    public UploadAvatar() {
        try {
            return new Promise((resolve, reject) => {
                this.s3Bucket.upload(this.params, (err: any, data: any) => {
                    if (err) {
                        reject();
                        throw new Error(err);
                    }
                    resolve(data);
                });
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public UploadCircleAvatar() {
        try {
            return new Promise((resolve, reject) => {
                this.s3Bucket.upload(this.params, (err: any, data: any) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(data.Location);
                });
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public UploadImage() {
        try {
            return new Promise((resolve, reject) => {
                this.s3Bucket.upload(this.params, (err: any, data: any) => {
                    if (err) { throw new Error(err); }
                    resolve(data.Location);
                });
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public UploadVideo() {
        try {
            return new Promise((resolve, reject) => {
                this.s3Bucket.upload(this.params, (err: any, data: any) => {
                    resolve(data.Location);
                });
            });
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }
}
