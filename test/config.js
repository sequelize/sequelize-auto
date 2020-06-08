
var path = require('path');

require('dotenv').config()

module.exports = {
  directory: path.join(__dirname, 'models'),
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_NAME,
  host: process.env.MYSQL_HOST,
  pool: { maxConnections: 5, maxIdleTime: 30000},

  rand: function() {
    return parseInt(Math.random() * 999, 10)
  },

  //make maxIdleTime small so that tests exit promptly
  mysql: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_NAME,
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    pool: { maxConnections: 5, maxIdleTime: 30}
  },

  sqlite: {
    username: process.env.SQLITE_USER,
    password: process.env.SQLITE_PASS,
    host: process.env.SQLITE_HOST,
    database: path.join(__dirname, "database.sqlite"),
    storage: path.join(__dirname, "database.sqlite")
  },

  postgres: {
    database: process.env.POSTGRES_NAME,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASS,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    pool: { maxConnections: 5, maxIdleTime: 30}
  },

  mssql: {
    database: process.env.MSSQL_NAME,
    username: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASS,
    host: process.env.MSSQL_HOST,
    port: process.env.MSSQL_PORT
  }
}
