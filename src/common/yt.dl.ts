import play, { YouTubeStream } from 'play-dl';

let stream: YouTubeStream = null;
let requestString = '';

export class Ytdl {
  static async info(args) {
    return await play.video_info(args);
  }

  static async createStream(args) {
    const argString = JSON.stringify(args);
    if (requestString !== argString || !stream) {
      requestString = argString;
      stream = await play.stream(args, {});
    }
    return stream;
  }

  static destroy() {
    stream.stream.destroy();
    stream = null;
    requestString = '';
  }
}
