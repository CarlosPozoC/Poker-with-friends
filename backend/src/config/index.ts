import dotenv from 'dotenv';
dotenv.config();

import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',
  reconnectGracePeriod: 30000,
  defaultBalance: 10000,
  maxPlayersPerRoom: 6,
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
  avatarsDir: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  maxAvatarSize: 2 * 1024 * 1024,
  ngrokAuthToken: process.env.NGROK_AUTHTOKEN || '',
  ngrokEnabled: process.env.NGROK_ENABLED === 'true',
};
