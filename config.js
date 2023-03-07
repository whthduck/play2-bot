const PLAYTODIED_DISCORD_TOKEN= process.env.PLAYTODIED_DISCORD_TOKEN || ""
if (!PLAYTODIED_DISCORD_TOKEN)
  throw new Error("Missing PLAYTODIED_DISCORD_TOKEN env");
module.exports = {
  name: "Play to Died",
  prefix: "$p2 ",
  token: PLAYTODIED_DISCORD_TOKEN,
};
