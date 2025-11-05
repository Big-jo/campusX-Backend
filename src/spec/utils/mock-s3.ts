/**
 * AWS S3 Mock Utilities
 * Provides S3 client mocks for testing file uploads
 */
import { S3 } from "aws-sdk";

/**
 * Create a mock S3 client that returns success responses
 */
export function createMockS3Client(): Partial<S3> {
  const mockClient = {
    upload: (params: S3.PutObjectRequest) => ({
      promise: async () => ({
        Location: `https://mock-s3-bucket.s3.amazonaws.com/${params.Key}`,
        ETag: '"mock-etag-123"',
        Bucket: params.Bucket || "mock-bucket",
        Key: params.Key || "mock-key",
      }),
    }),
    deleteObject: (params: S3.DeleteObjectRequest) => ({
      promise: async () => ({}),
    }),
    getObject: (params: S3.GetObjectRequest) => ({
      promise: async () => ({
        Body: Buffer.from("mock file content"),
        ContentType: "image/jpeg",
      }),
    }),
    headObject: (params: S3.HeadObjectRequest) => ({
      promise: async () => ({
        ContentLength: 1024,
        ContentType: "image/jpeg",
        ETag: '"mock-etag-123"',
      }),
    }),
  };

  return mockClient as Partial<S3>;
}

/**
 * Create a mock S3 upload middleware for multer-s3
 */
export function createMockS3Upload() {
  return {
    single: (fieldName: string) => (req: any, res: any, next: any) => {
      // Mock file upload
      if (req.file) {
        req.file.location = `https://mock-s3-bucket.s3.amazonaws.com/${req.file.filename}`;
      }
      next();
    },
    array: (fieldName: string, maxCount?: number) => (req: any, res: any, next: any) => {
      // Mock multiple file uploads
      if (req.files) {
        req.files = req.files.map((file: any) => ({
          ...file,
          location: `https://mock-s3-bucket.s3.amazonaws.com/${file.filename}`,
        }));
      }
      next();
    },
  };
}

/**
 * Mock file object for testing
 */
export function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "test-image.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    destination: "/tmp",
    filename: "mock-image-123.jpg",
    path: "/tmp/mock-image-123.jpg",
    buffer: Buffer.from("mock image content"),
    stream: null as any,
    ...overrides,
  };
}
