import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { flatten, unflatten } from 'flat';
import { DiscordStore, IDiscordStore } from './store.dto';

@Injectable()
export class StoreService<T = IDiscordStore> {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  createStore(channel: string) {
    return new DiscordStore<Cache>(this.cacheManager, channel);
  }

  async save(channel: string, data: T) {
    const prefix = `a${channel}`;
    const flatObj = flatten<Record<string, unknown>, Record<string, unknown>>({
      [prefix]: data,
    });
    this.cacheManager.store.mset(Object.entries(flatObj));
  }

  async retrive(channel: string): Promise<T> {
    const prefix = `a${channel}`;
    const keys = await this.cacheManager.store.keys(`${prefix}.*`);
    const values = await this.cacheManager.store.mget(...keys);
    const flatObj = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    const obj = unflatten(flatObj);
    return obj[prefix];
  }

  async all(): Promise<Record<string, T>> {
    const keys = await this.cacheManager.store.keys(`*`);
    const values = await this.cacheManager.store.mget(...keys);
    const flatObj = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    const obj: Record<string, T> = unflatten(flatObj);
    return obj;
  }
}
