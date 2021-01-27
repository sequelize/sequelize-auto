const path = require('path');
const output = path.join(__dirname, "./models");
const options = { directory: output, caseFile: 'l', caseModel: 'p', caseProp: 'c', lang: 'ts', singularize: true, spaces: true, indentation: 2 };

// Edit the configuration below for your database dialect

// sqlite
const storage = path.join(__dirname, "./northwind.sqlite");
const sqlite = {
  dbname: 'northwind',
  user: '',
  pass: '',
  options: { dialect: 'sqlite', storage: storage },
  autoOptions: { dialect: 'sqlite', storage: storage, ...options }
};

// mssql
const mssql = {
  dbname: 'northwind',
  user: 'mssql',
  pass: 'mssql',
  options: { dialect: 'mssql' },
  autoOptions: { dialect: 'mssql', ...options }
};

// mysql
const mysql = {
  dbname: 'northwind',
  user: 'mysql',
  pass: 'mysql',
  options: { dialect: 'mysql' },
  autoOptions: { dialect: 'mysql', ...options }
};

// postgres
const postgres = {
  dbname: 'Northwind',
  user: 'postgres',
  pass: 'postgres',
  options: { dialect: 'postgres' },
  autoOptions: { dialect: 'postgres', ...options }
};

// Change to export appropriate config for your database
module.exports = sqlite;
