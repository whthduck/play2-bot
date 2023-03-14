import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import configs from './configs';
import { EnvValidator } from './configs/enviroment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: EnvValidator,
      load: Object.values(configs),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('bull'),
    }),
    BotModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
