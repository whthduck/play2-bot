import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { ChannelType, Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { sleep } from 'src/common/utils';
import { Ytdl } from 'src/common/yt.dl';
import { Logger } from '@nestjs/common';

@SubCommand({ name: 'join', description: 'join a channel' })
export class JoinSubCommand {
  private readonly logger = new Logger(JoinSubCommand.name);

  @Handler()
  handler(@IA() dto: Message): string {
    return `Success register user:`;
  }

  @OnEvent('join')
  async on(args: string[], message: Message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("You're not MANAGE_CHANNELS permission");
    }
    if (!message.member.voice?.channel) {
      return message.reply("You're not in any voice channel");
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfMute: false,
      selfDeaf: false,
    });
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

    if (message.member.voice.channel.type === ChannelType.GuildStageVoice) {
      this.logger.log({ msg: 'Connection to a Stage Voice Channel' });
      await sleep(3000);
      message.guild.members.me.voice.setSuppressed(false);
    }

    const query = args.join(' ');
    try {
      const ytInfo = await Ytdl.info(query);
      if (!ytInfo.video_details?.title)
        return message.reply(
          'Your video link is not supported\nOnly support Youtube Video Url',
        );
    } catch (e) {
      this.logger.error({
        msg: 'Video details',
        err: e.message,
        stack: e.stack,
      });
      return message.reply(
        'Your video link is not supported\nOnly support Youtube Video Url',
      );
    }

    const cleanup = () => {
      Ytdl.destroy();
    };

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
      return message.reply('Occurr a network error. Please try again');
    });
    audioPlayer.on(AudioPlayerStatus.Playing, (oldState, newState) => {
      this.logger.log({ msg: 'Audio player is in the Playing state!' });
    });
    audioPlayer.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
      this.logger.log({ msg: 'Audio player is in the Idle state!' });
      cleanup();
      await sleep(1000);
      await play();
    });

    let resource: AudioResource = null;
    const play = async () => {
      const stream = await Ytdl.createStream(query);
      resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      audioPlayer.play(resource);
    };
    await play();
    connection.subscribe(audioPlayer);

    let speakingLatestAt = 0;
    connection.receiver.speaking.on('start', (userId) => {
      speakingLatestAt = Date.now();
      if (speakingLatestAt === 0) {
        resource.volume?.setVolumeLogarithmic(0.2);
      }
    });
    let timeout = null;
    connection.receiver.speaking.on('end', (userId) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resource.volume?.setVolumeLogarithmic(0.5);
        speakingLatestAt = 0;
      }, 5000);
    });
  }
}
