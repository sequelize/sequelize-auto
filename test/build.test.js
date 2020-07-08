
// var exec = require('child_process').exec;
// var path = require('path');
const {describe, before, after, it} = require('mocha');
// const describe = mocha.describe;
const chai = require('chai');
var expect = chai.expect;
var helpers = require('./helpers');
var dialect = helpers.getTestDialect();
var testConfig = require('./config');
var _ = require('lodash');
var lib = require('../index');

describe(helpers.getTestDialectTeaser("sequelize-auto build"), function() {
  var self = this
  self.timeout(10000);

  after(function(done) {
    helpers.clearDatabase(self.sequelize, done);
  });

  before(function(done) {
    helpers.initTests({
      dialect: dialect,
      beforeComplete: function(sequelize) {
        self.sequelize = sequelize
        self.User      = self.sequelize.define('User', {
          username:  { type: helpers.Sequelize.STRING },
          touchedAt: { type: helpers.Sequelize.DATE, defaultValue: helpers.Sequelize.NOW },
          aNumber:   { type: helpers.Sequelize.INTEGER },
          bNumber:   { type: helpers.Sequelize.INTEGER },

          validateTest: {
            type: helpers.Sequelize.INTEGER,
            allowNull: true
          },
          validateCustom: {
            type: helpers.Sequelize.STRING,
            allowNull: false
          },

          dateAllowNullTrue: {
            type: helpers.Sequelize.DATE,
            allowNull: true
          },

          defaultValueBoolean: {
            type: helpers.Sequelize.BOOLEAN,
            defaultValue: true
          }
        })

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          "some Text":  { type: helpers.Sequelize.STRING },
          aNumber:   { type: helpers.Sequelize.INTEGER },
          aRandomId: { type: helpers.Sequelize.INTEGER }
        })

        self.ParanoidUser = self.sequelize.define('ParanoidUser', {
          username: { type: helpers.Sequelize.STRING }
        }, {
          paranoid: true
        })

        self.ParanoidUser.belongsTo(self.User)
      },
      onComplete: function() {
        self.sequelize.sync().then(function () {
          var trigger = helpers.getDummyCreateTriggerStatement("HistoryLogs");
          self.sequelize.query(trigger).then(function(_){
            done();
          }, done);
        }, done);
      },
      onError: done
    });
  });


  var setupModels = function(self, callback, done) {
    var options = _.extend({
      spaces: true,
      indentation: 2,
      logging: false,
      directory: testConfig.directory,
      dialect: helpers.getTestDialect()
    }, testConfig[helpers.getTestDialect()], self.sequelize.config);

    var autoSequelize = new lib(self.sequelize.config.database, self.sequelize.config.username, self.sequelize.config.password, options);

    autoSequelize.build(function (err) {
      if (err) return done(err);
      try {
        callback(autoSequelize);
        done();
      } catch(err) {
        done(err)
      }
    });
  }

  describe("should be able to build", function() {
    it("the models", function(done) {
      function tableNameFromQname(v, n) {
          var tokens = n.split(".");
          return tokens[tokens.length -1]
      }
      setupModels(self, function(autoSequelize) {
        expect(autoSequelize).to.include.keys(['tables', 'foreignKeys']);

        autoSequelize.tables = _.mapKeys(autoSequelize.tables, tableNameFromQname)
        autoSequelize.foreignKeys = _.mapKeys(autoSequelize.foreignKeys, tableNameFromQname)
        autoSequelize.hasTriggerTables = _.mapKeys(autoSequelize.hasTriggerTables, tableNameFromQname)

        expect(autoSequelize.tables).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers']);
        expect(autoSequelize.hasTriggerTables).to.have.keys(['HistoryLogs']);

        if (helpers.getTestDialect() === "sqlite") {
          expect(autoSequelize.foreignKeys).to.have.keys(['ParanoidUsers']);
          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['UserId']);
        } else {
          expect(autoSequelize.foreignKeys).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers']);
          expect(autoSequelize.foreignKeys.Users).to.include.keys('id');
          expect(autoSequelize.foreignKeys.Users.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.Users.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Users.id.isSerialKey).to.be.true;

          expect(autoSequelize.foreignKeys.HistoryLogs).to.include.keys('id');
          expect(autoSequelize.foreignKeys.HistoryLogs.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.HistoryLogs.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.HistoryLogs.id.isSerialKey).to.be.true;

          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['id', 'UserId']);
          expect(autoSequelize.foreignKeys.ParanoidUsers.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.ParanoidUsers.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.ParanoidUsers.id.isSerialKey).to.be.true;
        }

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isForeignKey']);

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId.isForeignKey).to.be.true;
      }, done);
    });
  });
});
