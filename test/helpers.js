const Sequelize = require('sequelize');
const path = require('path');
const config = require(path.join(__dirname, 'config'));
const fs = require('fs');

module.exports = {
  Sequelize: Sequelize,
  views: false, // true to test generating models from views

  isSnakeTables() {
    // For mysql+innodb on Windows, table names are all lowercase, so we use snake_case to preserve word boundaries 
    // then convert back to UpperCamelCase (PascalCase) for file and class names (history_logs -> HistoryLogs) so tests pass
    const dialect = this.getTestDialect();
    return (dialect == 'mysql');
  },

  initTestData: function (test, dialect, done) {
    helpers = this;
    isSnakeTables = this.isSnakeTables();
    this.initTests({
      dialect: dialect,
      beforeComplete: function (sequelize) {
        test.sequelize = sequelize;
        test.User = test.sequelize.define('User', {
          username: { type: Sequelize.STRING },
          touchedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
          aNumber: { type: Sequelize.INTEGER, comment: 'Dev\'s "fix"' },
          bNumber: { 
            type: Sequelize.INTEGER, 
            comment: 'B Numbér',
            defaultValue: 42
          },
          validateTest: {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: '需要的环境'
          },
          validateCustom: {
            type: Sequelize.STRING,
            allowNull: false
          },
          dateAllowNullTrue: {
            type: Sequelize.DATE,
            allowNull: true
          },
          dateWithDefault: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
          },
          defaultValueBoolean: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
          }
        }, {
          schema: dialect == 'postgres' ? 'public' : undefined,
          tableName: isSnakeTables ? 'users' : undefined
        });

        test.HistoryLog = test.sequelize.define('HistoryLog', {
          'some Text': { type: Sequelize.STRING },
          '1Number': { type: Sequelize.INTEGER },
          aRandomId: { type: Sequelize.INTEGER }
        }, {
          tableName: isSnakeTables ? 'history_logs' : undefined
        });

        test.ParanoidUser = test.sequelize.define('ParanoidUser', {
            username: { type: Sequelize.STRING }
          },
          {
            paranoid: true,
            tableName: isSnakeTables ? 'paranoid_users' : undefined
          }
        );

        test.ParanoidUser.belongsTo(test.User);

        // test data for relationships across schemas
        // sqlite does not support schemas)
        var schema = (dialect == 'sqlite') ? undefined : 'family';
        if (schema) {
          test.sequelize.createSchema(schema);
        }

        test.Parent = test.sequelize.define('Parent', {
          parentId:  {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            field: 'ParentId'
          },
          name:   { type: Sequelize.STRING, field: 'Name' }
        }, {
          schema: schema,
          tableName: isSnakeTables ? 'parents' : undefined,
          timestamps: false,
        });

        test.Child = test.sequelize.define('Child', {
          childId:  {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            field: 'ChildId'
          },
          name:   { type: Sequelize.STRING, field: 'Name' }
        }, {
          schema: schema,
          tableName: isSnakeTables ? 'kids' : 'Kids',
          timestamps: false
        });

        test.Child.belongsTo(test.Parent, { foreignKey: 'ParentId' });
        test.Child.belongsTo(test.User);
        test.Parent.belongsTo(test.User);

      },
      onComplete: function () {
        test.sequelize.sync().then(function () {
          var tableName = isSnakeTables ? 'history_logs' : 'HistoryLogs';
          var trigger = helpers.getDummyCreateTriggerStatement(tableName);
          var crview = helpers.getCreateViewStatement(tableName);
          test.sequelize.query(trigger).then(function (_) {
            test.sequelize.query(crview).then(function (_) {
              done();
            }, done);
          }, done);
        }, done);
      },
      onError: done
    });
  },

  initTests: function (options) {
    if (!options || !options.onError || !options.onComplete) {
      throw new Error("options.onComplete+onError required");
    }

    try {
      const sequelize = this.createSequelizeInstance(options);

      this.clearDatabase(sequelize, function(err) {
        if (err) {
          return options.onError(err);
        }
        try {
          if (options.context) {
            options.context.sequelize = sequelize;
          }
          if (options.beforeComplete) {
            options.beforeComplete(sequelize);
          }
          options.onComplete(sequelize);
        } catch (err) {
          return options.onError(err);
        }
      });
    }
    catch (err) {
      return options.onError(err);
    }
  },

  createSequelizeInstance: function(options) {
    options = options || {};
    options.dialect = options.dialect || 'mysql';
    options.logging = options.hasOwnProperty('logging') ? options.logging : false;

    const sequelizeOptions = {
      logging: options.logging,
      dialect: options.dialect,
      host: config[options.dialect].host,
      port: config[options.dialect].port
    };

    if (config[options.dialect] && config[options.dialect].storage) {
      sequelizeOptions.storage = config[options.dialect].storage;
    }

    if (process.env.DIALECT === 'postgres-native') {
      sequelizeOptions.native = true;
    }

    if (process.env.DIALECT === 'mssql') {
      // set defaults for tedious, to silence the warnings
      sequelizeOptions.dialectOptions = { options: { trustServerCertificate: true, enableArithAbort: true }};
    }

    return new Sequelize(
      config[options.dialect].database,
      config[options.dialect].username,
      config[options.dialect].password,
      sequelizeOptions
    );
  },

  clearDatabase: function(sequelize, callback, close) {
    if (!sequelize) {
      return callback && callback();
    }

    function deleteModelFiles() {
      fs.readdir(config.directory, function(err, files) {
        if (err || !files || files.length < 1) {
          return callback && callback();
        }

        files.forEach(function(file) {
          const fileName = path.join(config.directory, file);
          const stat = fs.statSync(fileName);
          if (stat.isFile()) {
            fs.unlinkSync(fileName);
          }
        });
        callback && callback();
      });
    }

    function dropViews() {
      var drop = helpers.getDropViewStatement();
      return sequelize.query(drop);
    }

    function dropTables() {
      return sequelize.getQueryInterface().dropAllTables().then(_ => {
        if (close) {
          sequelize.close();
        }
      });
    }

    function error(err) {
      callback && callback(err);
    }

    try {
      dropViews().then(
        dropTables().then(
          deleteModelFiles, error)).catch(error);
    } catch(ex) {
      callback && callback(ex);
    }
  },

  getSupportedDialects: function() {
    return fs
      .readdirSync(path.join(__dirname, '..', 'node_modules', 'sequelize', 'lib', 'dialects'))
      .filter(function(file) {
        return file.indexOf('.js') === -1 && file.indexOf('abstract') === -1;
      });
  },

  getTestDialect: function() {
    let envDialect = process.env.DIALECT || 'mysql';
    if (envDialect === 'postgres-native') {
      envDialect = 'postgres';
    }

    if (this.getSupportedDialects().indexOf(envDialect) === -1) {
      throw new Error('The dialect you have passed is unknown. Did you really mean: ' + envDialect);
    }
    return envDialect;
  },

  getTestDialectTeaser: function(moduleName) {
    let dialect = this.getTestDialect();
    if (process.env.DIALECT === 'postgres-native') {
      dialect = 'postgres-native';
    }
    return `[${dialect.toUpperCase()}] ${moduleName}`;
  },

  checkMatchForDialects: function(dialect, value, expectations) {
    if (expectations.hasOwnProperty(dialect)) {
      expect(value).toMatch(expectations[dialect]);
    } else {
      throw new Error(`Undefined expectation for "${dialect}"!`);
    }
  },

  // for testing the `hasTrigger` flag
  getDummyCreateTriggerStatement: function(tableName) {
    var statement = {
      mysql:    'CREATE TRIGGER ' + tableName + '_Trigger BEFORE INSERT ON ' + tableName + ' FOR EACH ROW SET NEW.Id = NEW.Id',
      postgres: 'CREATE OR REPLACE FUNCTION blah() RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql; \
                 CREATE TRIGGER "' + tableName + '_Trigger" AFTER INSERT ON "' + tableName + '" WHEN (1=0) EXECUTE PROCEDURE blah(1);',
      mssql:    'CREATE TRIGGER ' + tableName + '_Trigger ON ' + tableName + ' AFTER INSERT AS BEGIN SELECT 1 WHERE 1=0; END;',
      sqlite:   'CREATE TRIGGER IF NOT EXISTS ' + tableName + '_Trigger AFTER INSERT ON ' + tableName + ' BEGIN SELECT 1 WHERE 1=0; END;'
    }[this.getTestDialect()];

    if (statement) return statement;

    throw new Error("CREATE TRIGGER not set for dialect " + this.getTestDialect());
  },

  // for testing view inclusion/exclusion
  getCreateViewStatement: function(tableName) {
    var statement = {
      mysql:    'CREATE OR REPLACE VIEW v_history AS SELECT aRandomId FROM ' + tableName + ';',
      postgres: 'CREATE OR REPLACE VIEW "VHistory" AS SELECT "aRandomId" FROM "' + tableName + '";',
      mssql:    'CREATE OR ALTER VIEW VHistory AS SELECT aRandomId FROM ' + tableName + ';',
      sqlite:   'CREATE VIEW IF NOT EXISTS "VHistory" AS SELECT aRandomId FROM ' + tableName + ';'
    }[this.getTestDialect()];

    if (statement) return statement;

    throw new Error("CREATE VIEW not set for dialect " + this.getTestDialect());
  },

  getDropViewStatement: function() {
    var statement = {
      mysql:    'DROP VIEW IF EXISTS v_history;',
      postgres: 'DROP VIEW IF EXISTS "VHistory";',
      mssql:    'DROP VIEW IF EXISTS VHistory;',
      sqlite:   'DROP VIEW IF EXISTS "VHistory";'
    }[this.getTestDialect()];

    if (statement) return statement;

    throw new Error("DROP VIEW not set for dialect " + this.getTestDialect());
  }

};
