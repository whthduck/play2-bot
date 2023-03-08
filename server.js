const express = require("express");
const Play2Bot = require("./play2-bot");

const app = express();
const port = process.env.PORT
const host = process.env.HOST

app.get("/", (req, res) => {
  res.send("sucess");
});

app.listen(port, host,() => {
  console.log(`App listening on port ${port}`);
  try {
    Play2Bot.start();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});
