
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
    helpers.initTestData(self, dialect, done);
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
          var token = tokens[tokens.length -1];

          // for innodb on Windows, all table names are lowercase, so we re-map them back to expected values.
          var map = {
            'users' : 'Users',
            'historylogs': 'HistoryLogs',
            'paranoidusers': 'ParanoidUsers',
            'parents': 'Parents',
            'kids': 'Kids'
          }
          token = map[token] || token;
          return token;
      }
      setupModels(self, function(autoSequelize) {
        expect(autoSequelize).to.include.keys(['tables', 'foreignKeys']);

        autoSequelize.tables = _.mapKeys(autoSequelize.tables, tableNameFromQname)
        autoSequelize.foreignKeys = _.mapKeys(autoSequelize.foreignKeys, tableNameFromQname)
        autoSequelize.hasTriggerTables = _.mapKeys(autoSequelize.hasTriggerTables, tableNameFromQname)

        const expectedTables = ['Users', 'HistoryLogs', 'ParanoidUsers', 'Parents', 'Kids'];

        expect(autoSequelize.tables).to.have.keys(expectedTables);
        expect(autoSequelize.hasTriggerTables).to.have.keys(['HistoryLogs']);

        if (helpers.getTestDialect() === "sqlite") {
          expect(autoSequelize.foreignKeys).to.have.keys(['Kids', 'Parents', 'ParanoidUsers']);
          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['UserId']);
          expect(autoSequelize.foreignKeys.Parents).to.include.keys(['UserId']);
          expect(autoSequelize.foreignKeys.Kids).to.include.keys(['UserId']);
          expect(autoSequelize.foreignKeys.Kids).to.include.keys(['ParentId']);
        } else {
          // mysql doesn't have full schema support
          var schema = (dialect == 'mysql') ? 'sequelize_auto_test' : 'family';

          expect(autoSequelize.foreignKeys).to.have.keys(expectedTables);
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

          expect(autoSequelize.foreignKeys.Parents).to.include.keys('ParentId');
          expect(autoSequelize.foreignKeys.Parents.ParentId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.Parents.ParentId.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Parents.ParentId.isSerialKey).to.be.true;
          expect(autoSequelize.foreignKeys.Parents.ParentId.source_schema).to.equal(schema);

          expect(autoSequelize.foreignKeys.Kids).to.include.keys('ChildId');
          expect(autoSequelize.foreignKeys.Kids.ChildId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.Kids.ChildId.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Kids.ChildId.isSerialKey).to.be.true;
          expect(autoSequelize.foreignKeys.Kids.ChildId.source_schema).to.equal(schema);

        }

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isForeignKey']);

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId.isForeignKey).to.be.true;
      }, done);
    });
  });
});
