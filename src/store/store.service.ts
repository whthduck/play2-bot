import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { flatten, unflatten } from 'flat';
import { DiscordStore } from './store.dto';

@Injectable()
export class StoreService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  createStore(channel: string) {
    return new DiscordStore<Cache>(this.cacheManager, channel);
  }

  async save(channel: string, data: Record<string, unknown>) {
    const prefix = `a${channel}`;
    const flatObj = flatten<Record<string, unknown>, Record<string, unknown>>({
      [prefix]: data,
    });
    this.cacheManager.store.mset(Object.entries(flatObj));
  }

  async retrive(channel: string) {
    const prefix = `a${channel}`;
    const keys = await this.cacheManager.store.keys(`${prefix}.*`);
    const values = await this.cacheManager.store.mget(...keys);
    const flatObj = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    const obj = unflatten(flatObj);
    return obj[prefix];
  }

  async all() {
    const keys = await this.cacheManager.store.keys(`*`);
    const values = await this.cacheManager.store.mget(...keys);
    const flatObj = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    const obj = unflatten(flatObj);
    return obj;
  }
}
