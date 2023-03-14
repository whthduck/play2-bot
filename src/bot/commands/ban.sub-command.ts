import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';
import { getVoiceConnection } from '@discordjs/voice';

@SubCommand({ name: 'ban', description: 'ban' })
export class BanSubCommand {
  @Handler()
  handler(@IA() message: Message) {
    // return this.getHelpTemplate();
  }

  @OnEvent('ban', { async: true })
  on(args: string[], message: Message) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("You're not BAN_MEMBERS permission");
    }

    let member = message.mentions.members.first();
    if (!member)
      return message.reply('Please mention a valid member of this server');
    if (!member.bannable)
      return message.reply(
        'I cannot ban this user! Do they have a higher role? Do I have ban permissions?',
      );
    if (!member.voice.channel || !message.member.voice.channel) {
      return message.reply(
        'Neither you or the person you are trying to ban are in a voice chat',
      );
    }

    let reason = args.slice(1).join(' ');
    if (!reason) reason = 'No reason provided';
    const connection = getVoiceConnection(message.guild.id);
    member.send(
      'You have been banned from ' + message.guild.name + ` for \"${reason}\"`,
    );
    member.ban({ reason: reason });
    connection.disconnect();
  }
}
