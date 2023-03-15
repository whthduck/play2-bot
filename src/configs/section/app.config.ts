import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  host: process.env.HOST || '0.0.0.0',
  base: process.env.BASE || '',
  port: process.env.PORT,
}));
