import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  CreateVoiceConnectionOptions,
  joinVoiceChannel,
  JoinVoiceChannelOptions,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  Guild,
  VoiceBasedChannel,
  ChannelType,
  StageChannel,
} from 'discord.js';
import { InjectPinoLogger, Logger, PinoLogger } from 'nestjs-pino';
import { InfoData, YouTubeStream, YouTubeVideo } from 'play-dl';
import { sleep } from 'src/common/utils';
import { DiscordStore } from 'src/store/store.dto';
import { StoreService } from 'src/store/store.service';
import { StreamService } from 'src/store/stream.service';

class Player {
  guild: Guild;
  channel: VoiceBasedChannel;
  streamInfo?: YouTubeVideo;
  connection: VoiceConnection;
  resource: AudioResource;
  audioPlayer: AudioPlayer;
  stream: YouTubeStream;
  isStarted: boolean;

  constructor(
    private readonly logger: PinoLogger,
    private readonly store: DiscordStore<Cache>,
    private readonly streamService: StreamService,
    guild: Guild,
    channel: VoiceBasedChannel,
    streamInfo?: YouTubeVideo,
    connection?: VoiceConnection,
  ) {
    this.channel = channel;
    this.guild = guild;
    this.connection = connection;
    this.streamInfo = streamInfo;
    this.logger.setContext(Player.name);
  }

  async createConnection(connection?: VoiceConnection) {
    if (connection) return (this.connection = connection);
    if (this.connection) return this.connection;

    this.connection = joinVoiceChannel({
      channelId: this.channel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfMute: false,
      selfDeaf: false,
    });
    this.connection.on(
      VoiceConnectionStatus.Connecting,
      (oldState, newState) => {
        this.logger.debug({
          msg: `Connection transitioned from ${oldState?.status} to ${newState?.status}`,
          oldState: oldState?.status,
          newState: newState?.status,
        });
        const oldNetworking = Reflect.get(oldState, 'networking');
        const newNetworking = Reflect.get(newState, 'networking');
        const networkStateChangeHandler = (
          oldNetworkState,
          newNetworkState,
        ) => {
          const newUdp = Reflect.get(newNetworkState, 'udp');
          clearInterval(newUdp?.keepAliveInterval);
        };

        oldNetworking?.off('stateChange', networkStateChangeHandler);
        newNetworking?.on('stateChange', networkStateChangeHandler);
      },
    );
    return this;
  }

  async createStream(stream?: YouTubeStream) {
    if (stream) return (this.stream = stream);
    this.stream = await this.streamService.createStream(
      this.guild.id,
      this.streamInfo.url,
    );
    return this;
  }

  createAudioResource() {
    this.resource = createAudioResource(this.stream.stream, {
      inputType: this.stream.type,
      inlineVolume: true,
    });
    return this;
  }

  createAudioPlayer(callback: (err, state) => void) {
    this.audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    this.audioPlayer.on('error', (e) => {
      this.logger.error({
        msg: 'Audio player is in Error state!',
        err: e.message,
        stack: e.stack,
        metadata: e.resource.metadata,
      });
      this.audioPlayer.removeAllListeners();
      callback(new Error('Occurr a network error. Please try again'), 'error');
    });
    this.audioPlayer.on(AudioPlayerStatus.Playing, (oldState, newState) => {
      this.logger.info({ msg: 'Audio player is in the Playing state!' });
    });
    this.audioPlayer.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
      this.logger.info({ msg: 'Audio player is in the Idle state!' });
      this.streamService.destroy(this.guild.id);
      await sleep(3000);
      await this.createStream();
      this.reset();
    });

    return this;
  }

  createSetVolume() {
    let speakingLatestAt = 0;
    let timeout = null;
    this.connection.receiver.speaking.on('start', (userId) => {
      speakingLatestAt = Date.now();
      if (speakingLatestAt === 0) {
        this.resource.volume?.setVolumeLogarithmic(0.2);
        this.logger.info({ msg: 'Set volume', volume: 0.2 });
      }
    });
    this.connection.receiver.speaking.on('end', (userId) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.resource.volume?.setVolumeLogarithmic(0.8);
        this.logger.info({ msg: 'Set volume', volume: 0.8 });
        speakingLatestAt = 0;
      }, 5000);
    });
    return this;
  }

  start() {
    if (this.isStarted) throw new Error('this method was called');
    if (this.channel.type === ChannelType.GuildStageVoice) {
      this.logger.info({ msg: 'Connection to a Stage Voice Channel' });
      this.guild.members.me.voice.setSuppressed(false);
      if (!this.channel.stageInstance)
        this.channel.createStageInstance({
          topic: this.streamInfo.title,
          sendStartNotification: true,
        });
    }
    this.connection.subscribe(this.audioPlayer);
    this.createSetVolume();
    this.isStarted = true;
  }

  play() {
    this.store.save({
      joinVoiceChannel: {
        channelId: this.channel.id,
        guildId: this.guild.id,
        selfMute: false,
        selfDeaf: false,
      },
      createStream: {
        guildId: this.guild.id,
        uri: this.streamInfo.url,
      },
    });
    if (this.audioPlayer.state.status !== AudioPlayerStatus.Playing)
      this.audioPlayer.play(this.resource);
    return this;
  }

  reset() {
    this.createAudioResource();
    this.play();
    return this;
  }
}

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

  createConnection(
    options: CreateVoiceConnectionOptions & JoinVoiceChannelOptions,
  ) {
    const connection = joinVoiceChannel(options);
    connection.on(VoiceConnectionStatus.Connecting, (oldState, newState) => {
      this.logger.debug({
        msg: `Connection transitioned from ${oldState?.status} to ${newState?.status}`,
        oldState: oldState?.status,
        newState: newState?.status,
      });
      const oldNetworking = Reflect.get(oldState, 'networking');
      const newNetworking = Reflect.get(newState, 'networking');
      const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
        const newUdp = Reflect.get(newNetworkState, 'udp');
        clearInterval(newUdp?.keepAliveInterval);
      };

      oldNetworking?.off('stateChange', networkStateChangeHandler);
      newNetworking?.on('stateChange', networkStateChangeHandler);
    });
    return connection;
  }
}
