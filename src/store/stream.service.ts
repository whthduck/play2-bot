import { Injectable } from '@nestjs/common';
import play, { YouTubeStream } from 'play-dl';

@Injectable()
export class StreamService {
  private streams = new Map<string, { stream: YouTubeStream; uri: string }>();
  constructor() {}

  async info(uri: string) {
    return play.video_info(uri);
  }

  async createStream(channel: string, uri: string) {
    const key = 'a' + channel;
    const streamInfo = await this.streams.get(key);
    if (streamInfo && streamInfo.uri === uri) {
      return streamInfo.stream;
    } else if (streamInfo && streamInfo.uri !== uri) {
      const stream = await play.stream(uri, {});
      this.destroy(key);
      this.streams.set(key, { stream, uri });
      return stream;
    } else {
      const stream = await play.stream(uri, {});
      this.streams.set(key, { stream, uri });
      return stream;
    }
  }

  destroy(channel: string) {
    const key = 'a' + channel;
    const streamInfo = this.streams.get(key);
    if (!streamInfo) return true;
    streamInfo.stream.stream.destroy();
    delete streamInfo.stream;
    delete streamInfo.uri;
    this.streams.delete(key);
  }
}
