export const sleep = async (ms = 1000) =>
  new Promise((rs, rj) => setTimeout(() => rs(true), ms));
