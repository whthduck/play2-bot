import {
  CreateVoiceConnectionOptions,
  joinVoiceChannel,
  JoinVoiceChannelOptions,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { Guild, VoiceBasedChannel } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StoreService } from 'src/store/store.service';
import { StreamService } from 'src/store/stream.service';
import { Player } from './player';

@Injectable()
export class PlayService {
  playerMap = new Map<string, Player>();

  constructor(
    @InjectPinoLogger(PlayService.name) private readonly logger: PinoLogger,
    private readonly storeService: StoreService,
    private readonly streamService: StreamService,
  ) {}

  async getPlayer(guild: Guild) {
    return this.playerMap.get(String(guild.id));
  }

  async createPlayer(guild: Guild, channel: VoiceBasedChannel, uri: string) {
    const ytInfo = await this.streamService.info(uri);
    if (!ytInfo.video_details?.title) throw new Error('NotYoutubeLink');
    const store = this.storeService.createStore(guild.id);
    const player = new Player(
      this.logger,
      store,
      this.streamService,
      guild,
      channel,
      ytInfo.video_details,
    );
    this.playerMap.set(String(guild.id), player);
    return player;
  }

  destroyPlayer(guild: Guild) {
    const player = this.playerMap.get(String(guild.id));
    if (!player) return null;
    player.audioPlayer.stop();
    player.audioPlayer.removeAllListeners();
    player.connection.disconnect();
    player.connection.removeAllListeners();
    this.playerMap.delete(String(guild.id));
  }
}
