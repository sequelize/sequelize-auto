if (typeof require === 'function') {
  var buster  = require("buster")
    , testConfig = require('./config')
    , Helpers = require('./buster-helpers')
    , dialect = Helpers.getTestDialect()
    , exec = require('child_process').exec;
}

require("referee");
var expect = buster.referee.expect;

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
      beforeComplete: function(sequelize) {
        self.sequelize = sequelize
        self.User      = self.sequelize.define('User', {
          username:  { type: Helpers.Sequelize.STRING },
          touchedAt: { type: Helpers.Sequelize.DATE, defaultValue: Helpers.Sequelize.NOW },
          aNumber:   { type: Helpers.Sequelize.INTEGER },
          bNumber:   { type: Helpers.Sequelize.INTEGER },

          validateTest: {
            type: Helpers.Sequelize.INTEGER,
            allowNull: true
          },
          validateCustom: {
            type: Helpers.Sequelize.STRING,
            allowNull: false
          },

          dateAllowNullTrue: {
            type: Helpers.Sequelize.DATE,
            allowNull: true
          },

          defaultValueBoolean: {
            type: Helpers.Sequelize.BOOLEAN,
            defaultValue: true
          }
        })

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          someText:  { type: Helpers.Sequelize.STRING },
          aNumber:   { type: Helpers.Sequelize.INTEGER },
          aRandomId: { type: Helpers.Sequelize.INTEGER }
        })

        self.ParanoidUser = self.sequelize.define('ParanoidUser', {
          username: { type: Helpers.Sequelize.STRING }
        }, {
          paranoid: true
        })

        self.ParanoidUser.belongsTo(self.User)
      },
      onComplete: function() {
          self.sequelize.sync().then(function () {
            done()
          }, done)
      }
    });
  });

  var setupModels = function(self, callback) {
    var config = self.sequelize.config;
    var execString = __dirname + "/../bin/sequelize-auto -o \"" + testConfig.directory + "\" -d " + config.database + " -h " + config.host;

    if (!!config.username)
      execString += " -u " + config.username + " ";
    if (!!config.password)
      execString += " -x " + config.password + " ";
    if (!!config.port)
      execString += " -p " + config.port + " ";
    if (!!self.sequelize.options.dialect)
      execString += " -e " + self.sequelize.options.dialect + " ";

    exec(execString, callback);
  }

  describe("should be able to generate", function(){
    it("the model files...", function(done){
      var self = this;

      setupModels(self, function(err, stdout){
        expect(err).toBeNull();
        if (self.sequelize.options.dialect === "postgres") {
          expect(stdout.indexOf('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'')).toBeGreaterThan(-1);
          ['Users','HistoryLogs','ParanoidUsers'].forEach(function(tbl){
            expect(stdout.indexOf('SELECT tc.constraint_type as "Constraint", c.column_name as "Field", c.column_default as "Default", c.is_nullable as "Null", CASE WHEN c.udt_name = \'hstore\' THEN c.udt_name ELSE c.data_type END as "Type", (SELECT array_agg(e.enumlabel) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON t.oid=e.enumtypid WHERE t.typname=c.udt_name) AS "special" FROM information_schema.columns c LEFT JOIN information_schema.key_column_usage cu ON c.table_name = cu.table_name AND cu.column_name = c.column_name LEFT JOIN information_schema.table_constraints tc ON c.table_name = tc.table_name AND cu.column_name = c.column_name AND tc.constraint_type = \'PRIMARY KEY\'  WHERE c.table_name = \'' + tbl + '\' AND c.table_schema = \'public\'')).toBeGreaterThan(-1);
          });
        }
        else if (self.sequelize.options.dialect === "sqlite") {
          expect(stdout.indexOf('FROM `sqlite_master` WHERE type=\'table\'')).toBeGreaterThan(-1);
        } else {
          expect(stdout.indexOf('SHOW TABLES;')).toBeGreaterThan(-1);
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
