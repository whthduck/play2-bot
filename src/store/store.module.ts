import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import { StoreService } from './store.service';
import { StreamService } from './stream.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore(configService.get('caching', {}));
        return { ...store, isGlobal: true, ttl: 0 };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [StoreService, StreamService],
  exports: [StoreService, StreamService],
})
export class StoreModule {}
