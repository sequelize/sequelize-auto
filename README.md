# Sequelize-Auto

<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/sequelize/sequelize-auto.svg)](https://greenkeeper.io/) -->

[![Build Status](http://img.shields.io/travis/sequelize/sequelize-auto/master.svg)](https://travis-ci.org/sequelize/sequelize-auto) [![Build status](https://ci.appveyor.com/api/projects/status/bf9lb89rmpj6iveb?svg=true)](https://ci.appveyor.com/project/durango/sequelize-auto) [![Code Climate](https://codeclimate.com/github/sequelize/sequelize-auto/badges/gpa.svg)](https://codeclimate.com/github/sequelize/sequelize-auto) [![Test Coverage](https://codeclimate.com/github/sequelize/sequelize-auto/badges/coverage.svg)](https://codeclimate.com/github/sequelize/sequelize-auto/coverage)

Automatically generate models for [SequelizeJS](https://github.com/sequelize/sequelize) via the command line.

## Install

    npm install sequelize-auto

## Prerequisites

You will need to install `sequelize`; it's no longer installed by `sequelize-auto`.

You will need to install the correct dialect binding before using sequelize-auto.

Dialect | Install
---|---
MySQL/MariaDB | `npm install mysql2`
Postgres | `npm install pg pg-hstore`
Sqlite | `npm install sqlite3`
MSSQL | `npm install tedious`


## Usage

    sequelize-auto -h <host> -d <database> -u <user> -x [password] -p [port]  --dialect [dialect] -c [/path/to/config] -o [/path/to/models] -t [tableName]

    Options:
      --help             Show help                                         [boolean]
      --version          Show version number                               [boolean]
      -c, --config       Path to JSON file for Sequelize's constructor "options"
                         flag object as defined here:
                         https://sequelize.org/v5/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
      -a, --additional   Path to JSON file containing model definitions (for all
                         tables) which are to be defined within a model's
                         configuration parameter. For more info: https://sequelize.org/v5/manual/models-definition.html#configuration
      -h, --host         IP/Hostname for the database.           [string] [required]
      -d, --database     Database name.                          [string] [required]
      -u, --user         Username for database.                             [string]
      -x, --pass         Password for database.                             [string]
      -p, --port         Port number for database (not for sqlite). Ex:
                         MySQL/MariaDB: 3306, Postgres: 5432, MSSQL: 1433   [number]
      -o, --output       What directory to place the models.                [string]
      -e, --dialect      The dialect/engine that you're using: postgres, mysql,
                         sqlite, mssql                                      [string]
      -t, --tables       Comma-separated names of tables to import          [string]
      -T, --skip-tables  Comma-separated names of tables to skip            [string]
      --cm, --caseModel  Set case of model names: c|l|o|p|u
                          c = camelCase
                          l = lower_case
                          o = original (default)
                          p = PascalCase
                          u = UPPER_CASE
      --cf, --caseFile   Set case of file names: c|l|o|p|u
      --cp, --caseProp   Set case of property names: c|l|o|p|u
      -n, --no-write     Prevent writing the models to disk.               [boolean]
      -s, --schema       Database schema from which to retrieve tables      [string]
      -l, --lang         Language for Model output: es5|es6|esm|ts
                          es5 = ES5 CJS modules (default)
                          es6 = ES6 CJS modules
                          esm = ES6 ESM modules
                          ts = TypeScript                                    [string]

> On Windows, provide the path to sequelize-auto: `node_modules\.bin\sequelize-auto [args]`

## Example

    sequelize-auto -o "./models" -d sequelize_auto_test -h localhost -u my_username -p 5432 -x my_password -e postgres

Produces a file/files such as ./models/Users.js which looks like:

    /* jshint indent: 2 */

    module.exports = function(sequelize, DataTypes) {
      return sequelize.define('Users', {
        'id': {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        'username': {
          type: DataTypes.STRING,
          allowNull: true
        },
        'touchedAt': {
          type: DataTypes.DATE,
          allowNull: true
        },
        'aNumber': {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        'bNumber': {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        'validateTest': {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        'validateCustom': {
          type: DataTypes.STRING,
          allowNull: false
        },
        'dateAllowNullTrue': {
          type: DataTypes.DATE,
          allowNull: true
        },
        'defaultValueBoolean': {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: '1'
        },
        'createdAt': {
          type: DataTypes.DATE,
          allowNull: false
        },
        'updatedAt': {
          type: DataTypes.DATE,
          allowNull: false
        }
      }, {
        tableName: 'Users',
        freezeTableName: true
      });
    };


Which makes it easy for you to simply [Sequelize.import](http://docs.sequelizejs.com/en/latest/docs/models-definition/#import) it (for Sequelize versions < 6).

For Sequelize version 6+, `Sequelize.import` is not available.  You should `require` the file and call the returned function:

    var Users = require('path/to/users')(sequelize, DataTypes);

See [this example from sequelize/cli](https://github.com/sequelize/cli/blob/master/src/assets/models/index.js#L24) for loading all files from a directory.

Also note that you can use the `-l es6` option to create the model definition files as ES6 classes, or `-l esm` option to create ES6 modules.  Then you would `require` or `import` the classes and call the `init(sequelize, DataTypes)` method on each class.

## Configuration options

For the `-c, --config` option, various JSON/configuration parameters are defined by Sequelize's `options` flag within the constructor. See the [Sequelize docs](https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor) for more info.

## Programmatic API

```js
var SequelizeAuto = require('sequelize-auto');
var auto = new SequelizeAuto('database', 'user', 'pass');

auto.run().then(data => {
  console.log(data.tables);      // table list
  console.log(data.foreignKeys); // foreign key list
  console.log(data.text)         // text of generated files
});


With options:
var auto = new SequelizeAuto('database', 'user', 'pass', {
    host: 'localhost',
    dialect: 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
    directory: false, // prevents the program from writing to disk
    port: 'port',
    caseModel: 'c', // convert snake_case column names to camelCase field names: user_id -> userId
    caseFile: 'c', // file names created for each model use camelCase.js not snake_case.js
    additional: {
        timestamps: false
        //...
    },
    tables: ['table1', 'table2', 'myschema.table3'] // use all tables if omitted
    //...
})
```

## Typescript

Add `-l ts` to cli options or `typescript: true` to programmatic options. Model usage in a ts file:

```js
// All models, can put in or extend to a db object at server init
import * as dbTables from './models/db.tables';
const tables = dbTables.getModels(sequelize); //:dbTables.ITable
tables.Device.findAll
// Single models
import * as dbDef from './models/db.d';
const devices:dbDef.DeviceModel = sequelize.import('./models/Device');
devices.findAll
```
## Resources

 - [Changelog](https://github.com/sequelize/sequelize-auto/blob/master/CHANGELOG.md)

## Testing

To set up: 

1. Create an empty database called `sequelize_auto_test` on your database server (sqlite excepted)
2. Create a `.env` file from `sample.env` and set your username/password/port etc.  The env is read by `test/config.js`
3. Build the TypeScript from the `src` directory into the `lib` directory:

    `npm run build`

Then run one of the test commands below:

    # for all
    npm run test

    # mysql only
    npm run test-mysql

    # postgres only
    npm run test-postgres

    # postgres native only
    npm run test-postgres-native

    # sqlite only
    npm run test-sqlite

