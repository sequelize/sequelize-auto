if (typeof require === 'function') {
  var buster  = require("buster")
    , testConfig = require('./config')
    , Helpers = require('./buster-helpers')
    , DataTypes = require(__dirname + '/../node_modules/sequelize/lib/data-types')
    , dialect = Helpers.getTestDialect()
    , exec = require('child_process').exec;
}

buster.spec.expose();
buster.testRunner.timeout = 1000000;

describe(Helpers.getTestDialectTeaser("sequelize-auto"), function() {
  after(function(done){
    Helpers.clearDatabase(this.sequelize, done);
  });

  before(function(done) {
    var self = this

    Helpers.initTests({
      dialect: dialect,
      beforeComplete: function(sequelize, DataTypes) {
        self.sequelize = sequelize
        self.User      = sequelize.define('User', {
          username:  { type: DataTypes.STRING },
          touchedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
          aNumber:   { type: DataTypes.INTEGER },
          bNumber:   { type: DataTypes.INTEGER },

          validateTest: {
            type: DataTypes.INTEGER,
            allowNull: true
          },
          validateCustom: {
            type: DataTypes.STRING,
            allowNull: false
          },

          dateAllowNullTrue: {
            type: DataTypes.DATE,
            allowNull: true
          },

          defaultValueBoolean: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
          }
        })

        self.HistoryLog = sequelize.define('HistoryLog', {
          someText:  { type: DataTypes.STRING },
          aNumber:   { type: DataTypes.INTEGER },
          aRandomId: { type: DataTypes.INTEGER }
        })

        self.ParanoidUser = sequelize.define('ParanoidUser', {
          username: { type: DataTypes.STRING }
        }, {
          paranoid: true
        })
      },
      onComplete: function() {
        self.User.sync({ force: true }).success(function(){
          self.HistoryLog.sync({ force: true }).success(function(){
            self.ParanoidUser.sync({force: true }).success(done)
          });
        });
      }
    });
  });

  var setupModels = function(self, callback) {
    var config = self.sequelize.config;
    var execString = __dirname + "/../bin/sequelize-auto -o \"" + testConfig.directory + "\" -d " + config.database + " -h " + config.host + " -u " + config.username;

    if (!!config.password) {
      execString += " -x " + config.password + " ";
    }
    if (!!config.port) {
      execString += " -p " + config.port + " ";
    }
    if (!!self.sequelize.options.dialect) {
      execString += " -e " + self.sequelize.options.dialect + " ";
    }

    exec(execString, callback);
  }

  describe("should be able to generate", function(){
    it("the model files...", function(done){
      var self = this;

      setupModels(self, function(err, stdout){
        expect(err).toBeNull();
        if (self.sequelize.options.dialect === "postgres") {
          expect(stdout.indexOf('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';')).toBeGreaterThan(-1);
          ['Users','HistoryLogs','ParanoidUsers'].forEach(function(tbl){
            expect(stdout.indexOf('SELECT c.column_name as "Field", c.column_default as "Default", c.is_nullable as "Null", c.data_type as "Type", (SELECT array_agg(e.enumlabel) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON t.oid=e.enumtypid WHERE t.typname=c.udt_name) AS special FROM information_schema.columns c WHERE table_name = \'' + tbl +'\';')).toBeGreaterThan(-1);
          });
        } else {
          expect(stdout.indexOf('Executing: SHOW TABLES;')).toBeGreaterThan(-1);
        }
        done();
      });
    });
  });

  describe("should be able to require", function(){
    before(function(done){
      var self = this;
      setupModels(self, done);
    });

    it("the model files...", function(done){
      var HistoryLogs = this.sequelize.import(testConfig.directory + '/HistoryLogs');
      var ParanoidUsers = this.sequelize.import(testConfig.directory + '/ParanoidUsers');
      var Users = this.sequelize.import(testConfig.directory + '/Users');

      expect(HistoryLogs.tableName).toEqual('HistoryLogs');
      ['someText', 'aNumber', 'aRandomId', 'id'].forEach(function(field){
        expect(HistoryLogs.rawAttributes[field]).toBeDefined();
      });

      expect(ParanoidUsers.tableName).toEqual('ParanoidUsers');
      ['username', 'id', 'createdAt', 'updatedAt', 'deletedAt'].forEach(function(field){
        expect(ParanoidUsers.rawAttributes[field]).toBeDefined();
      });

      expect(Users.tableName).toEqual('Users');
      ['username', 'touchedAt', 'aNumber', 'bNumber', 'validateTest', 'validateCustom', 'dateAllowNullTrue', 'id', 'createdAt', 'updatedAt'].forEach(function(field){
        expect(Users.rawAttributes[field]).toBeDefined();
      });

      expect(HistoryLogs.rawAttributes.someText.type.toString().indexOf('VARCHAR')).toBeGreaterThan(-1);
      expect(Users.rawAttributes.validateCustom.allowNull).toBeFalse();
      expect(Users.rawAttributes.dateAllowNullTrue.allowNull).toBeTrue();
      expect(Users.rawAttributes.dateAllowNullTrue.type).toMatch(/time/i);

      done();
    });
  });
});
