import { Storage } from '@google-cloud/storage';
import { logger } from '../shared';

/**
 * GCS singleton - reuses connection pool across all uploads
 */
class GCSClient {
  private static instance: Storage;

  private constructor() {}

  public static getInstance(): Storage {
    if (!GCSClient.instance) {
      // Decode base64-encoded service account key
      const credentials = process.env.GCS_SERVICE_ACCOUNT_KEY
        ? JSON.parse(
            Buffer.from(process.env.GCS_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
          )
        : undefined;

      logger.info("credentials", credentials);

      GCSClient.instance = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        ...(credentials && { credentials }),
      });

      logger.info('Initialized new GCS client instance');
    }
    logger.info('Reusing existing GCS client instance');
    return GCSClient.instance;
  }
}

export default GCSClient;
