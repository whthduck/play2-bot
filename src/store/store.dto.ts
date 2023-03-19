import { VoiceConnection } from '@discordjs/voice';
import { Cache } from 'cache-manager';
import { flatten, unflatten } from 'flat';

export class DiscordStore<T extends Cache> {
  channel: string;
  protected _connection?: VoiceConnection;
  protected db: T;

  constructor(db: T, channel: string) {
    this.channel = channel;
    this.db = db;
  }

  get connection() {
    return this._connection;
  }
  set connection(connection) {
    this._connection = connection;
  }

  async save(data: Record<string, unknown>) {
    const prefix = `a${this.channel}`;
    const flatObj = flatten<Record<string, unknown>, Record<string, unknown>>({
      [prefix]: data,
    });
    this.db.store.mset(Object.entries(flatObj));
  }

  async retrive() {
    const prefix = `a${this.channel}`;
    const keys = await this.db.store.keys(`${prefix}.*`);
    const values = await this.db.store.mget(...keys);
    const flatObj = Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    const obj = unflatten(flatObj);
    return obj[prefix];
  }
}
