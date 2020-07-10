const { describe, before, after, it } = require('mocha');
const chai = require('chai');
var expect = chai.expect;
var helpers = require('./helpers');
var dialect = helpers.getTestDialect();
var testConfig = require('./config');
var _ = require('lodash');
var lib = require('../index');

describe(helpers.getTestDialectTeaser("sequelize-auto build"), function() {
  var self = this;
  const isSnakeTables = helpers.isSnakeTables();
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
      dialect: helpers.getTestDialect(),
      camelCase: isSnakeTables ? 'ut' : undefined
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
          return tokens[tokens.length -1];
      }
      setupModels(self, function(autoSequelize) {
        expect(autoSequelize).to.include.keys(['tables', 'foreignKeys']);

        const tables = _.mapKeys(autoSequelize.tables, tableNameFromQname);
        const foreignKeys = _.mapKeys(autoSequelize.foreignKeys, tableNameFromQname);
        const hasTriggerTables = _.mapKeys(autoSequelize.hasTriggerTables, tableNameFromQname);

        var expectedTables = ['Users', 'HistoryLogs', 'ParanoidUsers', 'Parents', 'Kids'];
        if (isSnakeTables) {
          expectedTables = expectedTables.map(t => _.snakeCase(t));
        }

        expect(tables).to.have.keys(expectedTables);
        expect(hasTriggerTables).to.have.keys([isSnakeTables ? 'history_logs': 'HistoryLogs']);

        const fkUsers = foreignKeys[isSnakeTables ? 'users': 'Users'];
        const fkHistoryLogs = foreignKeys[isSnakeTables ? 'history_logs': 'HistoryLogs'];
        const fkParanoidUsers = foreignKeys[isSnakeTables ? 'paranoid_users': 'ParanoidUsers'];
        const fkParents = foreignKeys[isSnakeTables ? 'parents': 'Parents'];
        const fkKids = foreignKeys[isSnakeTables ? 'kids': 'Kids'];

        if (helpers.getTestDialect() === "sqlite") {
          expect(foreignKeys).to.have.keys(['Kids', 'Parents', 'ParanoidUsers']);
          expect(fkParanoidUsers).to.include.keys(['UserId']);
          expect(fkParents).to.include.keys(['UserId']);
          expect(fkKids).to.include.keys(['UserId']);
          expect(fkKids).to.include.keys(['ParentId']);
        } else {
          // mysql doesn't have full schema support, so source_schema is the db name
          var schema = (dialect == 'mysql') ? 'sequelize_auto_test' : 'family';

          expect(foreignKeys).to.have.keys(expectedTables);

          expect(fkUsers).to.include.keys('id');
          expect(fkUsers.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(fkUsers.id.isPrimaryKey).to.be.true;
          expect(fkUsers.id.isSerialKey).to.be.true;

          expect(fkHistoryLogs).to.include.keys('id');
          expect(fkHistoryLogs.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(fkHistoryLogs.id.isPrimaryKey).to.be.true;
          expect(fkHistoryLogs.id.isSerialKey).to.be.true;

          expect(fkParanoidUsers).to.include.keys(['id', 'UserId']);
          expect(fkParanoidUsers.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(fkParanoidUsers.id.isPrimaryKey).to.be.true;
          expect(fkParanoidUsers.id.isSerialKey).to.be.true;

          expect(fkParents).to.include.keys('ParentId');
          expect(fkParents.ParentId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(fkParents.ParentId.isPrimaryKey).to.be.true;
          expect(fkParents.ParentId.isSerialKey).to.be.true;
          expect(fkParents.ParentId.source_schema).to.equal(schema);

          expect(fkKids).to.include.keys('ChildId');
          expect(fkKids.ChildId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(fkKids.ChildId.isPrimaryKey).to.be.true;
          expect(fkKids.ChildId.isSerialKey).to.be.true;
          expect(fkKids.ChildId.source_schema).to.equal(schema);
        }

        expect(fkParanoidUsers.UserId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isForeignKey']);
        expect(fkParanoidUsers.UserId.isForeignKey).to.be.true;

      }, done);
    });
  });
});
