const {
  Events,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  Message,
  PermissionFlagsBits,
} = require("discord.js");
const Yt = require("./yt");
const {
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  getVoiceConnection,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
require("console-stamp")(console, "HH:MM:ss.l");
const configs = require("./config");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const Command = {};
/**
 *
 * @param {string[]} args
 * @param {Message} message
 * @returns
 */
Command.join = async function (args, message) {
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
  });
  connection.on(Events.state, (oldState, newState) => {
    console.log(
      `Connection transitioned from ${oldState.status} to ${newState.status}`
    );
  });
  connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
    console.log("Connection is in the Ready state!");
  });

  const query = args.join(" ");
  const ytInfo = await Yt.info(query);
  if (!ytInfo.video_details?.title)
    return message.reply(
      "Your video link is not supported\nOnly support Youtube Video Url"
    );

  let audioPlayer = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  let destroy = () => {};
  const play = async () => {
    const stream = await Yt.createStream(query);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });
    audioPlayer.play(resource);
    destroy = () => {
      resource.playStream.destroy();
      stream.stream.destroy();
      audioPlayer.stop(true);
    };
  };

  audioPlayer.on("error", (error) => {
    console.error(
      "Error:",
      error.message,
      "with track",
      error.resource.metadata.title
    );
  });
  audioPlayer.on(AudioPlayerStatus.Playing, (oldState, newState) => {
    console.log("Audio player is in the Playing state!");
  });
  audioPlayer.on(AudioPlayerStatus.Idle, (oldState, newState) => {
    console.log("Audio player is in the Idle state!");
    destroy();
    play();
  });
  audioPlayer.on("stateChange", (oldState, newState) => {
    console.log(
      `Audio player transitioned from ${oldState.status} to ${newState.status}`
    );
  });

  play();
  connection.subscribe(audioPlayer);
};

/**
 *
 * @param {string[]} args
 * @param {Message} message
 * @returns
 */
Command.ban = async function (args, message) {
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return message.reply("You're not BAN_MEMBERS permission");
  }
  if (!message.member.voice?.channel) {
    return message.reply("You're not in any voice channel");
  }

  let member = message.mentions.members.first();
  if (!member)
    return message.reply("Please mention a valid member of this server");
  if (!member.bannable)
    return message.reply(
      "I cannot ban this user! Do they have a higher role? Do I have ban permissions?"
    );
  if (!member.voice.channel || !message.member.voice.channel) {
    return message.reply(
      "Neither you or the person you are trying to ban are in a voice chat"
    );
  }

  let reason = args.slice(1).join(" ");
  if (!reason) reason = "No reason provided";
  const connection = getVoiceConnection(message.guild.id);
  member.send("You have been banned from " + guildName + ` for \"${reason}\"`);
  member.ban(reason);
  connection.disconnect();
};

/**
 *
 * @param {string[]} args
 * @param {Message} message
 * @returns
 */
Command.leave = async function (args, message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return message.reply("You're not MANAGE_CHANNELS permission");
  }
  if (!message.member.voice?.channel) {
    return message.reply("You're not in any voice channel");
  }
  const connection = getVoiceConnection(message.guild.id);
  connection.destroy();
};

/**
 *
 * @param {string[]} args
 * @param {Message} message
 * @returns
 */
Command.help = async function (args, message) {
  const helpEmbed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Play to died Bots")
    .setAuthor(
      "Bot by ivan nguyeexn#6885",
      "https://cdn.discordapp.com/app-icons/1079812652471156737/208dba48245536390bdc778c3f00daf0.png?size=512"
    )
    .setDescription(
      "I will join your server and play a song"
    )
    .setThumbnail(
      "https://media.giphy.com/media/LzinRMeoxdpAt6w2n7/giphy.gif"
    )
    .addFields(
      {
        name: "- $poi help",
        value: "This command...",
      },
      {
        name: "- $poi join",
        value: "Joins the voice channel you are in",
      },
      {
        name: "- $poi leave",
        value: "Leaves the voice channel incase needed!",
      },
      {
        name: "- $poi ban <tag user>",
        value:
          "Bans the user while music is playing! Will DM the user that he has been banned.",
      }
    );
  return message.channel.send(helpEmbed);
};

exports.start = () => {
  // Crash if any token is empty
  if (!configs.token) {
    throw new Error("Token is empty");
  }

  //Okay before I get destroyed, I suck at programming, I'm already aware
  client.login(configs.token);
  console.log("Client has logged in.");

  client.once(Events.ClientReady, () => {
    console.log("Ready to run!");
    client.user.setActivity({ name: configs.name, type: "LISTENING" });
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(configs.prefix)) return;

    let guildName = message.guild.name;
    const args = message.content.slice(configs.prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    console.log("Command for " + command + " Recieved in Server: " + guildName);

    if (Command[command]) {
      try {
        await Command[command](args, message);
      } catch (e) {
        console.error(e);
      }
    } else {
      return message.reply("Syntax is wrong");
    }
  });
};
