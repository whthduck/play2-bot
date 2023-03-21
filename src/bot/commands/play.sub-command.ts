import {
  Handler,
  IA,
  InjectDiscordClient,
  On,
  SubCommand,
} from '@discord-nestjs/core';
import { Client, Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PlayService } from '../play.service';
import { AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import { StoreService } from 'src/store/store.service';
import { IDiscordStore } from 'src/store/store.dto';
import { StreamService } from 'src/store/stream.service';
import { sleep } from 'src/common/utils';

@SubCommand({ name: 'play', description: 'join a channel' })
export class PlaySubCommand {
  constructor(
    @InjectPinoLogger(PlaySubCommand.name) private readonly logger: PinoLogger,
    @InjectDiscordClient() private readonly client: Client,
    private readonly playService: PlayService,
    private readonly storeService: StoreService,
  ) {}

  @Handler()
  handler(@IA() dto: Message): string {
    return `Success register user:`;
  }

  @OnEvent('play')
  async on(args: string[], message: Message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("You're not MANAGE_CHANNELS permission");
    }
    const { joinVoiceChannel, createStream } = await this.storeService.retrive(
      message.guild.id,
    );
    const channel = await this.client.channels.fetch(
      joinVoiceChannel.channelId,
    );
    if (!channel.isVoiceBased())
      return message.reply("You're not in any voice channel");

    const prePlayer = await this.playService.getPlayer(message.guild);
    if (!prePlayer) return message.reply("You're not in any voice channel");
    else this.playService.destroyPlayer(message.guild);

    try {
      const player = await this.playService.createPlayer(
        message.guild,
        message.member.voice.channel,
        args.join(' '),
      );
      await player.attachStream();
      await player.connectToChannel();
      player.start();
      await message.reply('Playing now!');
    } catch (e) {
      this.logger.error(e);
    }
  }
}
