import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@shared';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

export class S3 {
    private bucketName: string;
    private fileName: string;
    private fileBuffer: Buffer;
    private contentType: string;

    constructor(public ID: string, public file: any, public folder: string) {
        this.fileBuffer = file.buffer;
        this.contentType = file.mimetype;
        this.bucketName = process.env.S3_BUCKET as string;
        this.fileName = `${folder}/${ID}`;
    }

    private async upload(): Promise<string> {
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: this.fileName,
                Body: this.fileBuffer,
                ContentType: this.contentType,
                CacheControl: 'public, max-age=31536000',
            }));
            return this.getPublicUrl();
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public async UploadAvatar() { return this.upload(); }
    public async UploadCircleAvatar() { return this.upload(); }
    public async UploadCircleCoverImage() { return this.upload(); }
    public async UploadImage() { return this.upload(); }
    public async UploadVideo() { return this.upload(); }

    private getPublicUrl(): string {
        if (process.env.S3_PUBLIC_URL) {
            return `${process.env.S3_PUBLIC_URL}/${this.fileName}`;
        }
        return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${this.fileName}`;
    }
}
