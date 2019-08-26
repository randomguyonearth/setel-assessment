require('dotenv').config();
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3001 });

server.start();

server.register([
  require('blipp'),
  require('./routes/payment/routes'),
]);

module.exports = server;
