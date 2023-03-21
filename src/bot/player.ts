import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Cache } from 'cache-manager';
import { Guild, VoiceBasedChannel, ChannelType } from 'discord.js';
import { PinoLogger } from 'nestjs-pino';
import { YouTubeStream, YouTubeVideo } from 'play-dl';
import { sleep } from 'src/common/utils';
import { DiscordStore } from 'src/store/store.dto';
import { StreamService } from 'src/store/stream.service';

export class Player {
  maxTransmissionGap = 5000;
  audioPlayer: AudioPlayer;
  resource: AudioResource;
  guild: Guild;
  channel: VoiceBasedChannel;
  streamInfo?: YouTubeVideo;
  connection: VoiceConnection;
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

    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
        maxMissedFrames: Math.round(this.maxTransmissionGap / 20),
      },
    });

    this.audioPlayer.on('stateChange', (oldState, newState) => {
      this.logger.info({
        msg: 'Playback has changed',
        oldState: oldState.status,
        newState: newState.status,
      });
      if (
        oldState.status !== AudioPlayerStatus.Playing &&
        newState.status === AudioPlayerStatus.Playing
      ) {
        this.logger.info({ msg: 'Playing audio output on audio player' });
      } else if (newState.status === AudioPlayerStatus.Idle) {
        this.logger.info({
          msg: 'Playback has stopped. Attempting to restart.',
        });
        this.attachStream();
      }
    });
    this.audioPlayer.on('error', (e) => {
      this.logger.error({
        msg: 'Audio player is in Error state!',
        err: e.message,
        stack: e.stack,
        metadata: e.resource.metadata,
      });
      // this.audioPlayer.removeAllListeners();
      // callback(new Error('Occurr a network error. Please try again'), 'error');
    });
  }

  async attachStream(stream?: YouTubeStream) {
    if (stream) return (this.stream = stream);
    await this.streamService.destroy(this.guild.id);
    this.stream = await this.streamService.createStream(
      this.guild.id,
      this.streamInfo.url,
    );
    this.resource = createAudioResource(this.stream.stream, {
      inputType: this.stream.type,
      inlineVolume: true,
    });
    this.audioPlayer.play(this.resource);
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
    this.logger.info({ msg: 'Attached stream', url: this.streamInfo.url });
  }

  async connectToChannel(connection?: VoiceConnection) {
    if (!!connection) return (this.connection = connection);
    if (!!this.connection) return this.connection;

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

    if (this.channel.type === ChannelType.GuildStageVoice) {
      this.logger.info({
        msg: 'Connection to a Stage Voice Channel',
        name: this.channel.name,
        type: this.channel.type,
      });
      await sleep(1000);
      this.guild.members.me.voice.setSuppressed(false);
      if (!this.channel.stageInstance)
        this.channel.createStageInstance({
          topic: this.streamInfo.title,
          sendStartNotification: true,
        });
    } else {
      this.logger.info({
        msg: 'Connection to a Voice Channel',
        name: this.channel.name,
        type: this.channel.type,
      });
    }
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      return this.connection;
    } catch (error) {
      this.connection.destroy();
      throw error;
    }
  }

  protected setSmartVolume(min: number, max: number) {
    let speakingLatestAt = 0;
    let timeout = null;
    this.connection.receiver.speaking.on('start', (userId) => {
      speakingLatestAt = Date.now();
      if (speakingLatestAt === 0) {
        this.resource.volume?.setVolumeLogarithmic(min);
        this.logger.info({ msg: 'Set volume', volume: min });
      }
    });
    this.connection.receiver.speaking.on('end', (userId) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.resource.volume?.setVolumeLogarithmic(max);
        this.logger.info({ msg: 'Set volume', volume: max });
        speakingLatestAt = 0;
      }, 5000);
    });
    return this;
  }

  start() {
    if (this.isStarted) throw new Error('this method was called');
    this.connection.subscribe(this.audioPlayer);
    this.setSmartVolume(0.2, 0.8);
    this.isStarted = true;
  }
}
