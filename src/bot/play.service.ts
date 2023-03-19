import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, CreateVoiceConnectionOptions, joinVoiceChannel, JoinVoiceChannelOptions, NoSubscriberBehavior, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { Guild, VoiceBasedChannel, ChannelType } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sleep } from 'src/common/utils';
import { StoreService } from 'src/store/store.service';
import { StreamService } from 'src/store/stream.service';

@Injectable()
export class PlayService {
  constructor(
    @InjectPinoLogger(PlayService.name) private readonly logger: PinoLogger,
    private readonly storeService: StoreService,
    private readonly streamService: StreamService,
  ) {}

  async play(guild: Guild, channel: VoiceBasedChannel, connection: VoiceConnection, uri: string) {
    const channelId = channel.id;
    const guildId = guild.id;
    // const connection = this.createConnection({
    //   channelId: channelId,
    //   guildId: guildId,
    //   adapterCreator: guild.voiceAdapterCreator,
    //   selfMute: false,
    //   selfDeaf: false,
    // });
    if (channel.type === ChannelType.GuildStageVoice) {
      this.logger.info({ msg: 'Connection to a Stage Voice Channel' });
      await sleep(1000);
      guild.members.me.voice.setSuppressed(false);
    }

    // Store connection config
    const store = this.storeService.createStore(guildId);
    store.save({
      joinVoiceChannel: {
        channelId,
        guildId,
        selfMute: false,
        selfDeaf: false,
      },
    });

    try {
      const ytInfo = await this.streamService.info(uri);
      if (!ytInfo.video_details?.title) throw new Error('NotYoutubeLink');
    } catch (e) {
      this.logger.error({ err: e.message, stack: e.stack });
      channel.send(
        'Your video link is not supported\nOnly support Youtube Video Url',
      );
    }

    let resource: AudioResource = null;
    const play = async () => {
      const stream = await this.streamService.createStream(guildId, uri);
      resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      audioPlayer.play(resource);
      store.save({ createStream: { guildId, uri } });
    };

    let audioPlayer = this.createAudioPlayer(async (e, audioState) => {
      if (e) return channel.send(e.message);
      if (audioState === AudioPlayerStatus.Idle) {
        this.streamService.destroy(guildId);
        await sleep(1000);
        await play();
      }
    });

    await play();
    connection.subscribe(audioPlayer);
    this.createSetVolume(connection, resource);
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

  createAudioPlayer(callback: (err, state) => void) {
    let audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    audioPlayer.on('error', (e) => {
      this.logger.error({
        msg: 'Audio player is in Error state!',
        err: e.message,
        stack: e.stack,
        metadata: e.resource.metadata,
      });
      audioPlayer.removeAllListeners();
      callback(new Error('Occurr a network error. Please try again'), 'error');
    });
    audioPlayer.on(AudioPlayerStatus.Playing, (oldState, newState) => {
      this.logger.info({ msg: 'Audio player is in the Playing state!' });
    });
    audioPlayer.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
      this.logger.info({ msg: 'Audio player is in the Idle state!' });
      callback(null, AudioPlayerStatus.Idle);
    });

    return audioPlayer;
  }

  createSetVolume(connection: VoiceConnection, resource: AudioResource) {
    let speakingLatestAt = 0;
    let timeout = null;
    connection.receiver.speaking.on('start', (userId) => {
      speakingLatestAt = Date.now();
      if (speakingLatestAt === 0) {
        resource.volume?.setVolumeLogarithmic(0.2);
      }
    });
    connection.receiver.speaking.on('end', (userId) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resource.volume?.setVolumeLogarithmic(0.5);
        speakingLatestAt = 0;
      }, 5000);
    });
  }
}
