const { createNestApp } = require('./dist/main');

let serverPromise;

async function getServer() {
  if (serverPromise) {
    return serverPromise;
  }

  serverPromise = (async () => {
    const app = await createNestApp();
    await app.init();
    return app.getHttpServer();
  })();

  return serverPromise;
}

module.exports = async function handler(req, res) {
  const server = await getServer();
  server.emit('request', req, res);
};
