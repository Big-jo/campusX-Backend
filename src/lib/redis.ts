import IORedis from 'ioredis';

/**
 * Redis client singleton for v2 services
 */
class RedisClient {
  private static instance: IORedis.Redis;

  private constructor() {}

  public static getInstance(): IORedis.Redis {
    if (!RedisClient.instance) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        RedisClient.instance = new IORedis();
      } else {
        const redisPort = Number(process.env.REDIS_PORT);
        RedisClient.instance = new IORedis(redisPort, process.env.REDIS_HOST, {
          password: process.env.REDIS_PASS,
          tls: {
            rejectUnauthorized: true,
          },
          username: process.env.REDIS_USER,
        });
      }

      RedisClient.instance.on('connect', () => {
        console.log('Redis v2 client connected');
      });

      RedisClient.instance.on('error', (err) => {
        console.error('Redis v2 client error:', err);
      });
    }

    return RedisClient.instance;
  }
}

export default RedisClient;
