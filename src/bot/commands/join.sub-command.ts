import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PlayService } from '../play.service';
@SubCommand({ name: 'join', description: 'join a channel' })
export class JoinSubCommand {
  constructor(
    @InjectPinoLogger(JoinSubCommand.name) private readonly logger: PinoLogger,
    private readonly playService: PlayService,
  ) {}

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
    if (this.playService.getPlayer(message.guild))
      this.playService.destroyPlayer(message.guild);

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
