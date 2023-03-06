if (!process.env.PLAYTODIED_DISCORD_TOKEN)
  throw new Error("Missing PLAYTODIED_DISCORD_TOKEN env");
module.exports = {
  name: "Play to Died",
  prefix: "$poi ",
  token: process.env.PLAYTODIED_DISCORD_TOKEN,
};
