const PLAYTODIED_DISCORD_TOKEN= process.env.PLAYTODIED_DISCORD_TOKEN || "MTA3OTgxMjY1MjQ3MTE1NjczNw.GyVq2w.afkzl73NAk27brYMVj1l_inVWMqwmRzc0yjjks"
if (!PLAYTODIED_DISCORD_TOKEN)
  throw new Error("Missing PLAYTODIED_DISCORD_TOKEN env");
module.exports = {
  name: "Play to Died",
  prefix: "$p2 ",
  token: PLAYTODIED_DISCORD_TOKEN,
};
