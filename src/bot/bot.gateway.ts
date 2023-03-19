import { PrefixCommandInterceptor } from '@discord-nestjs/common';
import {
  InjectDiscordClient,
  On,
  Once,
  MessageEvent,
} from '@discord-nestjs/core';
import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client, ActivityType, Message, Events } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class BotGateway {
  constructor(
    @InjectPinoLogger(BotGateway.name) private readonly logger: PinoLogger,
    @InjectDiscordClient() private readonly client: Client,
    private readonly configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Once(Events.ClientReady)
  onReady() {
    this.logger.info({ msg: `Bot ${this.client.user.tag} was started!` });
    this.client.user.setActivity({
      name: this.configService.get('discord.name'),
      type: ActivityType.Listening,
    });
    this.eventEmitter.emit('rejoin');
  }

  @On(Events.MessageCreate)
  @UseInterceptors(
    new PrefixCommandInterceptor('p2', {
      prefix: '$',
      isRemovePrefix: true,
      isRemoveCommandName: true,
      isIgnoreBotMessage: true,
    }),
  )
  async onMessage(@MessageEvent() message: Message) {
    const [subcommand, ...args] = message.content.split(/ +/);

    this.logger.info({
      msg: `Command for ${subcommand} Recieved in Server: ${message.guild.name}`,
      channel: message.channelId,
      guildId: message.guildId,
      guildName: message.guild.name,
      subcommand,
    });

    try {
      await this.eventEmitter.emitAsync(subcommand, args, message);
    } catch (e) {
      this.logger.error({
        msg: `${subcommand} fail`,
        err: e.message,
        stack: e.stack,
      });
    }
  }
}
