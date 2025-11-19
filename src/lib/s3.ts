import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@shared';
import UserModel from '../models/User.model';
import {Circle} from '../entities/Circles/Circle';
import CircleModel from 'src/models/Circle.model';

export class S3 {
    public s3Client: S3Client;
    public params: {
        Bucket: string;
        Key: string;
        Body: any;
        ContentType: any;
    };
    private publicUrl: string;

    /**
     * Creates an instance of S3.
     * @param {string} ID - Identifier for the file
     * @param {*} file
     * @param {string} folder
     * @memberof S3
     */
    constructor(public ID: string, public file: any, public folder: string) {
        // Initialize R2 client with Cloudflare endpoint
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
            },
        });

        this.publicUrl = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

        switch (folder) {
            case 'avatars':
                this.params = {
                    Bucket: process.env.R2_BUCKET_AVATAR as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            case 'image':
                this.params = {
                    Bucket: process.env.R2_BUCKET_IMAGE as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            case 'video':
                this.params = {
                    Bucket: process.env.R2_BUCKET_VIDEO as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            case 'expressions':
                this.params = {
                    Bucket: process.env.R2_BUCKET_EXPRESSIONS as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            case 'circle-avatars':
                this.params = {
                    Bucket: process.env.R2_BUCKET_CIRCLE_AVATAR as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            case 'circle-cover-image':
                this.params = {
                    Bucket: process.env.R2_BUCKET_CIRCLE_COVER_IMAGE as string,
                    Key: ID,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };
                break;
            default:
                throw new Error('No folder chosen');
        }

    }

    public async UploadAvatar() {
        try {
            const command = new PutObjectCommand(this.params);
            await this.s3Client.send(command);
            return this.getPublicUrl();
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public async UploadCircleAvatar() {
        try {
            const command = new PutObjectCommand(this.params);
            await this.s3Client.send(command);
            return this.getPublicUrl();
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public async UploadCircleCoverImage() {
        try {
            const command = new PutObjectCommand(this.params);
            await this.s3Client.send(command);
            return this.getPublicUrl();
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public async UploadImage() {
        try {
            const command = new PutObjectCommand(this.params);
            await this.s3Client.send(command);
            return this.getPublicUrl();
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

    public async UploadVideo() {
        try {
            const command = new PutObjectCommand(this.params);
            await this.s3Client.send(command);
            return this.getPublicUrl();
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    private getPublicUrl(): string {
        return `${this.publicUrl}/${this.params.Bucket}/${this.params.Key}`;
    }
}
