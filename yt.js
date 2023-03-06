const play = require("play-dl");

exports.info = async function (args) {
  return await play.video_info(args);
};

exports.createStream = async function (args) {
  return await play.stream(args,{});
};
