import Redis from 'ioredis';

/**
 * Redis client singleton for v2 services
 * Supports multiple database instances
 */
class RedisClient {
  private static instances: Map<number, Redis> = new Map();

  private constructor() {}

  public static getInstance(db: number = 0): Redis {
    if (!RedisClient.instances.has(db)) {
       console.log(`Creating new Redis v2 client instance for DB ${db}`);
        const redisPort = Number(process.env.REDIS_PORT);
        const instance = new Redis({
          password: process.env.REDIS_PASS,
          username: process.env.REDIS_USER,
          family: 6,
          host: process.env.REDIS_HOST,
          port: redisPort,
          db: db,
          maxRetriesPerRequest: null,
        });

        instance.on('connecting', () => {
          console.log(`Redis v2 client DB ${db} connecting...`);
        });

        instance.on('connect', () => {
          console.log(`Redis v2 client DB ${db} connected`);
        });

        instance.on('error', (err) => {
          console.error(`Redis v2 client DB ${db} error:`, err);
        });

        instance.on('end', () => {
          console.log(`Redis v2 client DB ${db} disconnected`);
        });

        RedisClient.instances.set(db, instance);
    }

    return RedisClient.instances.get(db)!;
  }
}

export default RedisClient;
