var path = require('path');

module.exports = {
  directory: path.resolve(__dirname + '/models'),
  username: "root",
  password: null,
  database: 'sequelize_auto_test',
  host: '127.0.0.1',
  pool: { maxConnections: 5, maxIdleTime: 30000},

  rand: function() {
    return parseInt(Math.random() * 999)
  },

  //make maxIdleTime small so that tests exit promptly
  mysql: {
    username: "root",
    password: null,
    database: 'sequelize_auto_test',
    host: '127.0.0.1',
    port: 3306,
    pool: { maxConnections: 5, maxIdleTime: 30}
  },

  sqlite: {
  },

  postgres: {
    database: 'sequelize_auto_test',
    username: "postgres",
    port: 5432,
    pool: { maxConnections: 5, maxIdleTime: 30}
  }
}
