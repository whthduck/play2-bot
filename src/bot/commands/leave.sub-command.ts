import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { getVoiceConnection } from '@discordjs/voice';

@SubCommand({ name: 'leave', description: 'leave' })
export class LeaveSubCommand {
  @Handler()
  handler(@IA() message: Message) {
    // return this.getHelpTemplate();
  }

  @OnEvent('leave', { async: true })
  on(args: string[], message: Message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply("You're not MANAGE_CHANNELS permission");
    }
    if (!message.member.voice?.channel) {
      return message.reply("You're not in any voice channel");
    }
    const connection = getVoiceConnection(message.guild.id);
    connection.destroy();
  }
}
