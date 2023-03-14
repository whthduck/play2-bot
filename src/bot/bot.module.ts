import { DiscordModule } from '@discord-nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GatewayIntentBits, Partials } from 'discord.js';
import { BotGateway } from './bot.gateway';
import { BanSubCommand } from './commands/ban.sub-command';
import { HelpSubCommand } from './commands/help.sub-command';
import { JoinSubCommand } from './commands/join.sub-command';
import { LeaveSubCommand } from './commands/leave.sub-command';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    DiscordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('discord.token'),
        discordClientOptions: {
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
          ],
          partials: [Partials.Channel, Partials.Message],
        },
        autoLogin: true,
      }),
    }),
  ],
  controllers: [],
  providers: [BotGateway, JoinSubCommand, HelpSubCommand, LeaveSubCommand, BanSubCommand],
  exports: [],
})
export class BotModule {}
