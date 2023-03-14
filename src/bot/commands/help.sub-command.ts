import { Handler, IA, On, SubCommand } from '@discord-nestjs/core';
import { EmbedBuilder, Message } from 'discord.js';
import { OnEvent } from '@nestjs/event-emitter';

@SubCommand({ name: 'help', description: 'help' })
export class HelpSubCommand {
  @Handler()
  handler(@IA() message: Message) {
    return this.getHelpTemplate();
  }

  @OnEvent('help', { async: true })
  on(args: string[], message: Message) {
    const helpMessage = this.getHelpTemplate();
    return message.reply({ embeds: [helpMessage] });
  }

  getHelpTemplate() {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Play to died Bots')
      .setAuthor({
        name: 'Bot by ivan nguyeexn#6885',
        iconURL:
          'https://cdn.discordapp.com/app-icons/1079812652471156737/208dba48245536390bdc778c3f00daf0.png?size=512',
      })
      .setDescription('I will join your server and play a song')
      .setThumbnail(
        'https://media.giphy.com/media/LzinRMeoxdpAt6w2n7/giphy.gif',
      )
      .addFields(
        {
          name: ` help`,
          value: 'This command...',
        },
        {
          name: ` join <url>`,
          value: 'Joins the voice channel you are in',
        },
        {
          name: ` leave`,
          value: 'Leaves the voice channel incase needed!',
        },
        {
          name: ` ban <tag user>`,
          value:
            'Bans the user while music is playing! Will DM the user that he has been banned.',
        },
      );
    return helpEmbed;
  }
}
