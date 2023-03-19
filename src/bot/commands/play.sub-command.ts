import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PlayService } from '../play.service';
import { getVoiceConnection } from '@discordjs/voice';

@SubCommand({ name: 'play', description: 'join a channel' })
export class PlaySubCommand {
  constructor(
    @InjectPinoLogger(PlaySubCommand.name) private readonly logger: PinoLogger,
    private readonly playService: PlayService,
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
    if (!message.member.voice?.channel) {
      return message.reply("You're not in any voice channel");
    }

    const uri = args.join(' ');
    const connection = getVoiceConnection(message.guild.id)
    // if(!connection) 
    await this.playService.play(
      message.guild,
      message.member.voice.channel,
      connection,
      uri,
    );
  }
}
