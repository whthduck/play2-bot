import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

process.on('uncaughtException', function (err) {
  console.info('*** uncaughtException ***', err.message);
  console.error(err);
});

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(configService.get('app.base'));

  await app.listen(
    configService.get('app.port'),
    configService.get('app.host'),
  );
}
bootstrap();
