/**
 * Google Cloud Storage Mock Utilities
 * Provides GCS client mocks for testing file uploads
 */

/**
 * Create a mock GCS Storage client
 */
export function createMockS3Client() {
  const mockBucket = {
    file: jest.fn().mockReturnValue({
      save: jest.fn().mockResolvedValue(undefined),
      makePublic: jest.fn().mockResolvedValue(undefined),
    }),
  };

  return {
    bucket: jest.fn().mockReturnValue(mockBucket),
  } as any;
}

/**
 * Create a mock S3 upload middleware for multer-s3
 */
export function createMockS3Upload() {
  return {
    single: (fieldName: string) => (req: any, res: any, next: any) => {
      // Mock file upload
      if (req.file) {
        req.file.location = `https://storage.googleapis.com/mock-bucket/${req.file.filename}`;
      }
      next();
    },
    array: (fieldName: string, maxCount?: number) => (req: any, res: any, next: any) => {
      // Mock multiple file uploads
      if (req.files) {
        req.files = req.files.map((file: any) => ({
          ...file,
          location: `https://storage.googleapis.com/mock-bucket/${file.filename}`,
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
