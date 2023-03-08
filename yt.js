const play = require("play-dl");

/** @type {import("play-dl").YouTubeStream} */
let stream = null;
let requestString = "";

exports.info = async function (args) {
  return await play.video_info(args);
};

exports.createStream = async function (args) {
  const argString = JSON.stringify(args);
  if (requestString !== argString || !stream) {
    requestString = argString;
    stream = await play.stream(args, {});
  }
  return stream;
};

exports.destroy = function () {
  stream.stream.destroy();
  stream = null;
  requestString = "";
};
