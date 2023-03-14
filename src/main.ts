import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
// import Play2Bot from './play2-bot';

process.on('uncaughtException', function (err) {
  console.info('*** uncaughtException ***', err.message);
  console.error(err);
});

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      },
    }),
  );
  const configService = app.get(ConfigService);
  app.setGlobalPrefix(configService.get('app.base'));

  // Play2Bot.start();

  await app.listen(configService.get('app.port'));
}
bootstrap();
