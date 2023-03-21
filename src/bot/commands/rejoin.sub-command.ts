import {
  Handler,
  IA,
  InjectDiscordClient,
  SubCommand,
} from '@discord-nestjs/core';
import { Client, Message } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StoreService } from 'src/store/store.service';
import { PlayService } from '../play.service';

@SubCommand({ name: 'rejoin', description: 'rejoin a channel' })
export class RejoinSubCommand {
  constructor(
    @InjectPinoLogger(RejoinSubCommand.name)
    private readonly logger: PinoLogger,
    @InjectDiscordClient() private readonly client: Client,
    private readonly storeService: StoreService,
    private readonly playService: PlayService,
  ) {}

  @Handler()
  handler(@IA() dto: Message): string {
    return `Success register user:`;
  }

  @OnEvent('rejoin')
  async on() {
    const allGuild = await this.storeService.all();

    for (const { createStream, joinVoiceChannel } of Object.values(allGuild)) {
      try {
        const channel = await this.client.channels.fetch(
          joinVoiceChannel.channelId,
        );
        if (!channel.isVoiceBased()) throw new Error('NotVoiceChannel');

        const player = await this.playService.createPlayer(
          channel['guild'],
          channel,
          createStream.uri,
        );
        await player.attachStream();
        await player.connectToChannel();
        player.start();
      } catch (e) {
        this.logger.error({ err: e.message, stack: e.stack });
      }
    }
  }
}
