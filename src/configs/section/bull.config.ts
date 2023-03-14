import { BullModuleOptions } from '@nestjs/bull';
import { registerAs } from '@nestjs/config';

export default registerAs('bull', (): BullModuleOptions => ({
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
  },
}));
