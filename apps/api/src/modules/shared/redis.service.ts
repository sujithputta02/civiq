import { Redis } from 'ioredis';
import { env } from '@civiq/config-env';
import logger from '../../utils/logger.js';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err: unknown) => {
  logger.error(err, 'Redis connection error');
});

export default redis;
