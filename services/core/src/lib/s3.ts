import { Storage } from '@google-cloud/storage';
import { logger } from '@shared';
import GCSClient from './gcs-client';

export class S3 {
    private storage: Storage;
    private bucketName: string;
    private fileName: string;
    private fileBuffer: Buffer;
    private contentType: string;

    /**
     * Creates an instance of S3 (now using GCS).
     * Uses singleton GCS client for connection pooling.
     * @param {string} ID - Identifier for the file
     * @param {*} file
     * @param {string} folder
     * @memberof S3
     */
    constructor(public ID: string, public file: any, public folder: string) {
        // Reuse singleton GCS client
        this.storage = GCSClient.getInstance();

        this.fileBuffer = file.buffer;
        this.contentType = file.mimetype;

        // Single bucket with folder prefixes
        this.bucketName = process.env.GCS_BUCKET as string;
        this.fileName = `${folder}/${ID}`;
    }

    private async upload(): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const blob = bucket.file(this.fileName);

            await blob.save(this.fileBuffer, {
                contentType: this.contentType,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });

            // Bucket has uniform bucket-level access - configure public access via IAM instead
            return this.getPublicUrl();
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public async UploadAvatar() {
        return this.upload();
    }

    public async UploadCircleAvatar() {
        return this.upload();
    }

    public async UploadCircleCoverImage() {
        return this.upload();
    }

    public async UploadImage() {
        return this.upload();
    }

    public async UploadVideo() {
        return this.upload();
    }

    private getPublicUrl(): string {
        // Option 1: Use custom domain if configured
        if (process.env.GCS_PUBLIC_URL) {
            return `${process.env.GCS_PUBLIC_URL}/${this.fileName}`;
        }

        // Option 2: Use standard GCS public URL
        return `https://storage.googleapis.com/${this.bucketName}/${this.fileName}`;
    }
}
