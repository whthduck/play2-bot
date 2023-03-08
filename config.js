const PLAY2_DISCORD_TOKEN= process.env.PLAY2_DISCORD_TOKEN || ""
if (!PLAY2_DISCORD_TOKEN)
  throw new Error("Missing PLAY2_DISCORD_TOKEN env");
module.exports = {
  name: "Play2 Bot",
  prefix: "$p2 ",
  token: PLAY2_DISCORD_TOKEN,
};
