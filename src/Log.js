const { DatabaseCredentials, Logger } = require('@dulliag/logger.js');
const { database } = require('./credentials.json');

const credentials = new DatabaseCredentials(
  database.host,
  database.user,
  database.password,
  database.database
);

module.exports = {
  credentials,
  logger: new Logger(credentials, 'DulliBot'),
};
