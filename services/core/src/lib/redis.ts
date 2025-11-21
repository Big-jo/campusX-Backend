import Redis from 'ioredis';

/**
 * Redis client singleton for v2 services
 */
class RedisClient {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
       console.log('Creating new Redis v2 client instance');
        const redisPort = Number(process.env.REDIS_PORT);
        RedisClient.instance = new Redis({
          password: process.env.REDIS_PASS,
          username: process.env.REDIS_USER,
          family: 6,
          host: process.env.REDIS_HOST,
          port: redisPort,
          maxRetriesPerRequest: null,
        });

        RedisClient.instance.on('connecting', () => {
          console.log('Redis v2 client connecting...');
        });

        RedisClient.instance.on('connect', () => {
          console.log('Redis v2 client connected');
        });

        RedisClient.instance.on('error', (err) => {
          console.error('Redis v2 client error:', err);
        });

        RedisClient.instance.on('end', () => {
          console.log('Redis v2 client disconnected');
        });
    }

    return RedisClient.instance;
  }
}

export default RedisClient;
