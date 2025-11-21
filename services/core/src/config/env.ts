import { z } from 'zod';

/**
 * Environment variable validation schema
 *
 * Validates all required and optional environment variables on startup.
 * Provides type-safe access to env vars throughout the application.
 */
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),

  // MongoDB
  MONGO_URI: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASS: z.string().optional(),
  REDIS_URL: z.string().optional(), // Alternative to REDIS_HOST/PORT

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Circle & Timeline Settings
  VISITED_CIRCLE_EXP_TIME: z.string().transform(Number).default(24),
  VISITED_CIRCLE_EXP_UNI: z.enum(['seconds', 'minutes', 'hours', 'days']).default('hours'),
  POST_EXPIRE: z.string().transform(Number).default(7),
  POST_EXPIRE_UNIT: z.enum(['seconds', 'minutes', 'hours', 'days']).default('days'),
  CAMPUS_T_EXPIRY_TIME: z.string().transform(Number).default(1),
  CAMPUS_T_EXPIRY_UNIT: z.enum(['seconds', 'minutes', 'hours', 'days']).default('hours'),

  // Cleanup Intervals
  CAMPUS_T_CLEANUP_INTERVAL: z.string().transform(Number).default(3600000),
  VISITED_CIRCLE_CLEAN_UP_INTERVAL: z.string().transform(Number).default(86400000),
  TIMELINE_CLEAN_UP_INTERVAL: z.string().transform(Number).default(3600000),

  // Google Cloud Storage
  GCS_PROJECT_ID: z.string(),
  GCS_BUCKET: z.string(),
  GCS_SERVICE_ACCOUNT_KEY: z.string().optional(), // Path to JSON file or stringified JSON
  GCS_PUBLIC_URL: z.string().optional(), // For custom domains

  // Sentry
  // DSN: z.string().url().optional(),

  // SMTP
  SMTP_HOST: z.string(),
  // SMPT_PORT: z.string().regex(/^\d+$/).transform(Number),
  SMTP_USERNAME: z.string(),
  SMTP_PASSWORD: z.string(),
  // EMAIL_FROM: z.string().email(),

  // Firebase Cloud Messaging (optional in test/dev, required in production)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FCM_SERVER_KEY: z.string().optional(), // Legacy, if still used

  // E2E Testing (optional)
  E2E_MONGO_URI: z.string().url().optional(),
  E2E_REDIS_HOST: z.string().optional(),
  E2E_REDIS_PORT: z.string().transform(Number).optional(),
  E2E_PORT: z.string().transform(Number).optional(),

  // Notification expiry
  NOTIF_EXPIRE: z.string().transform(Number).optional(),
});

/**
 * Validates environment variables against the schema
 * @throws {Error} If validation fails
 */
export function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional validation for production environment
    if (parsed.NODE_ENV === 'production') {
      const missingFirebase = [];
      if (!parsed.FIREBASE_PROJECT_ID) missingFirebase.push('FIREBASE_PROJECT_ID');
      if (!parsed.FIREBASE_CLIENT_EMAIL) missingFirebase.push('FIREBASE_CLIENT_EMAIL');
      if (!parsed.FIREBASE_PRIVATE_KEY) missingFirebase.push('FIREBASE_PRIVATE_KEY');

      if (missingFirebase.length > 0) {
        console.error('❌ Production environment requires Firebase credentials:');
        missingFirebase.forEach((field) => console.error(`  - ${field}: Required in production`));
        throw new Error('Missing required Firebase credentials in production');
      }

      // Validate private key format in production
      if (parsed.FIREBASE_PRIVATE_KEY && !parsed.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
        throw new Error('FIREBASE_PRIVATE_KEY must be a valid PEM private key');
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      console.error('❌ Environment validation failed:');
      errorMessages.forEach((msg) => console.error(`  - ${msg}`));
      throw new Error('Invalid environment variables');
    }
    throw error;
  }
}

// Export the type for TypeScript autocomplete
export type Env = z.infer<typeof envSchema>;

// Validate on import (will throw if invalid)
// Comment this out if you want manual validation
// export const env = validateEnv();
