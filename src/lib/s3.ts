import { Storage } from '@google-cloud/storage';
import { logger } from '@shared';

export class S3 {
    private storage: Storage;
    private bucketName: string;
    private fileName: string;
    private fileBuffer: Buffer;
    private contentType: string;

    /**
     * Creates an instance of S3 (now using GCS).
     * @param {string} ID - Identifier for the file
     * @param {*} file
     * @param {string} folder
     * @memberof S3
     */
    constructor(public ID: string, public file: any, public folder: string) {
        // Initialize GCS client
        const credentials = process.env.GCS_SERVICE_ACCOUNT_KEY
            ? (process.env.GCS_SERVICE_ACCOUNT_KEY.startsWith('{')
                ? JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY)
                : require(process.env.GCS_SERVICE_ACCOUNT_KEY))
            : undefined;

        this.storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID,
            ...(credentials && { credentials }),
        });

        this.fileName = ID;
        this.fileBuffer = file.buffer;
        this.contentType = file.mimetype;

        // Map folder to bucket name
        switch (folder) {
            case 'avatars':
                this.bucketName = process.env.GCS_BUCKET_AVATAR as string;
                break;
            case 'image':
                this.bucketName = process.env.GCS_BUCKET_IMAGE as string;
                break;
            case 'video':
                this.bucketName = process.env.GCS_BUCKET_VIDEO as string;
                break;
            case 'expressions':
                this.bucketName = process.env.GCS_BUCKET_EXPRESSIONS as string;
                break;
            case 'circle-avatars':
                this.bucketName = process.env.GCS_BUCKET_CIRCLE_AVATAR as string;
                break;
            case 'circle-cover-image':
                this.bucketName = process.env.GCS_BUCKET_CIRCLE_COVER_IMAGE as string;
                break;
            default:
                throw new Error('No folder chosen');
        }
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

            // Make file public (optional - remove if using signed URLs)
            await blob.makePublic();

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
