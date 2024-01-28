const SequelizeAuto = require('../index');

// Edit your database settings in config.js
const config = require('./config');

const auto = new SequelizeAuto('afrikmart', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  directory: './models', // where to write files
  port: '3306',
  lang: 'ts',
  caseModel: '0',
  caseFile: '0',
  noAlias: true,
});

auto.run().then((data) => {
  // const tableNames = Object.keys(data.tables);
  // console.log(tableNames); // table list
  // console.log(data.foreignKeys); // foreign key list
  // console.log(data.text)         // text of generated files
});
