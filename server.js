const express = require("express");
const Appbot = require("./app-bot");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("sucess");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  try {
    Appbot.start();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});
