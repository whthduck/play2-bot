import { registerAs } from '@nestjs/config';

export default registerAs('caching', () => ({
  isGlobal: true,
  // Store-specific configuration:
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
}));
