import { BullModule } from '@nestjs/bull';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import configs from './configs';
import { EnvValidator } from './configs/enviroment';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: EnvValidator,
      load: Object.values(configs),
    }),
    LoggerModule.forRoot({
      exclude: ['/live', '/ready'],
      pinoHttp: {
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('bull'),
      inject: [ConfigService],
    }),
    StoreModule,
    BotModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
