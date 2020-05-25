# Sequelize-Auto

[![Greenkeeper badge](https://badges.greenkeeper.io/sequelize/sequelize-auto.svg)](https://greenkeeper.io/)

[![Build Status](http://img.shields.io/travis/sequelize/sequelize-auto/master.svg)](https://travis-ci.org/sequelize/sequelize-auto) [![Build status](https://ci.appveyor.com/api/projects/status/bf9lb89rmpj6iveb?svg=true)](https://ci.appveyor.com/project/durango/sequelize-auto) [![Dependency Status](https://david-dm.org/sequelize/sequelize-auto.svg)](https://david-dm.org/sequelize/sequelize-auto) [![Code Climate](https://codeclimate.com/github/sequelize/sequelize-auto/badges/gpa.svg)](https://codeclimate.com/github/sequelize/sequelize-auto) [![Test Coverage](https://codeclimate.com/github/sequelize/sequelize-auto/badges/coverage.svg)](https://codeclimate.com/github/sequelize/sequelize-auto/coverage)

Automatically generate models for [SequelizeJS](https://github.com/sequelize/sequelize) via the command line.

## Install

    npm install -g @puti94/sequelize-auto

## Prerequisites

You will need to install the correct dialect binding globally before using sequelize-auto.

Example for MySQL/MariaDB

`npm install -g mysql`

Example for Postgres

`npm install -g pg pg-hstore`

Example for Sqlite3

`npm install -g sqlite`

Example for MSSQL

`npm install -g mssql`

## Usage

    [node] sequelize-auto -h <host> -d <database> -u <user> -x [password] -p [port]  --dialect [dialect] -c [/path/to/config] -o [/path/to/models] -t [tableName] -C

    Options:
      -h, --host        IP/Hostname for the database.   [required]
      -d, --database    Database name.                  [required]
      -u, --user        Username for database.
      -x, --pass        Password for database.
      -p, --port        Port number for database.
      -c, --config      JSON file for Sequelize's constructor "options" flag object as defined here: https://sequelize.readthedocs.org/en/latest/api/sequelize/
      -o, --output      What directory to place the models.
      -e, --dialect     The dialect/engine that you're using: postgres, mysql, sqlite
      -a, --additional  Path to a json file containing model definitions (for all tables) which are to be defined within a model's configuration parameter. For more info: https://sequelize.readthedocs.org/en/latest/docs/models-definition/#configuration
      -t, --tables      Comma-separated names of tables to import
      -T, --skip-tables Comma-separated names of tables to skip
      -C, --camel       Use camel case to name models and fields
      -n, --no-write    Prevent writing the models to disk.
      -s, --schema      Database schema from which to retrieve tables
      -z, --typescript  Output models as typescript with a definitions file.

## Example

    sequelize-auto -o "./models" -d sequelize_auto_test -h localhost -u my_username -p 5432 -x my_password -e postgres

Produces a file/files such as ./models/Users.js which looks like:

    /* jshint indent: 1*/
    module.exports = function (sequelize, DataTypes) {
    	const Model = sequelize.define('sysRole', {
        roleId: {
    			type: DataTypes.BIGINT,
    			allowNull: false,
    			primaryKey: true,
    			autoIncrement: true,
    			field: 'role_id'
    		},
    		roleName: {
    			type: DataTypes.STRING(100),
    			comment: '角色名称',
    			field: 'role_name'
    		},
    		remark: {
    			type: DataTypes.STRING(100),
    			comment: '备注'
    		},
    		createUserId: {
    			type: DataTypes.BIGINT,
    			comment: '创建者ID',
    			field: 'create_user_id'
    		},
    		createTime: {
    			type: DataTypes.DATE,
    			comment: '创建时间',
    			field: 'create_time'
    		},
    		deptId: {
    			type: DataTypes.BIGINT,
    			comment: '部门ID',
    			field: 'dept_id'
    		}
    	}, {
    		tableName: 'sys_role',
    		comment: '角色'
    	});
    	Model.associate = function (models) {
    	//  Model.hasMany(models.xx, {sourceKey: "xx", foreignKey: "xx"});
    	};
    	return Model;
    };



Which makes it easy for you to simply [Sequelize.import](http://docs.sequelizejs.com/en/latest/docs/models-definition/#import) it.

## Configuration options

For the `-c, --config` option the following JSON/configuration parameters are defined by Sequelize's `options` flag within the constructor. For more info:

[https://sequelize.readthedocs.org/en/latest/api/sequelize/](https://sequelize.readthedocs.org/en/latest/api/sequelize/)

## Programmatic API

```js
var {AutoSequelize} = require('@puti94/sequelize-auto')
var auto = new AutoSequelize('database', 'user', 'pass');

auto.prepare().then(()=> {
  console.log(auto.tables); // table list
  console.log(auto.foreignKeys); // foreign key list
  
  // 可以使用这个方法自动调用 注入 models
  auto.initModels();
  
  auto.outputFiles().then(()=>console.log('success'))
});

//With options:
var auto = new SequelizeAuto('database', 'user', 'pass', {
    host: 'localhost',
    dialect: 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
    directory: false, // prevents the program from writing to disk
    port: 'port',
    additional: {
        timestamps: false
        //...
    },
    tables: ['table1', 'table2', 'table3']
    //...
})
```

## Testing

You must setup a database called `sequelize_auto_test` first, edit the `test/config.js` file accordingly, and then enter in any of the following:

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

## Projects Using Sequelize-Auto

* [Sequelizer](https://github.com/andyforever/sequelizer)
