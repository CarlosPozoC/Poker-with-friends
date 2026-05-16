import Redis from 'ioredis';
import { config } from './index';

const redis = new Redis(config.redisUrl, {
  retryStrategy(times) {
    if (times > 5) {
      return null;
    }
    return Math.min(times * 500, 3000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', () => {});

redis.on('ready', () => {
  console.log('[Redis] Ready');
});

export default redis;