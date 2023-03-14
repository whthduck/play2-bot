import { registerAs } from '@nestjs/config';

export default registerAs('discord', () => ({
  name: 'Play2 Bot',
  token: process.env.PLAY2_DISCORD_TOKEN,
}));
