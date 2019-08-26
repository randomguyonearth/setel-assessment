require('dotenv').config();
const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.start();

server.register([
  require('blipp'),
  require('hapi-postgres-connection'),
  require('./routes/order/routes'),
]);

module.exports = server;
