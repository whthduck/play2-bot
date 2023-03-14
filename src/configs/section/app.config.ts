import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  base: process.env.BASE || '',
  port: process.env.PORT,
}));
