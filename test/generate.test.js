
var exec = require('child_process').exec;
var path = require('path');
var chai = require('chai');
var expect = chai.expect;
var helpers = require('./helpers');
var dialect = helpers.getTestDialect();
var testConfig = require('./config');
var _ = helpers.Sequelize.Utils._;

describe(helpers.getTestDialectTeaser("sequelize-auto"), function() {
  after(function(done) {
    helpers.clearDatabase(this.sequelize, done);
  });

  before(function(done) {
    var self = this

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
        }, {
          indexes: [
            {
              name: 'index_name_a_b',
              method: 'BTREE',
              fields: ['username', 'aNumber', 'bNumber']
            }
          ]
        })

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          'some Text':  { type: helpers.Sequelize.STRING },
          'aNumber':   { type: helpers.Sequelize.INTEGER },
          'aRandomId': { type: helpers.Sequelize.INTEGER }
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
          done();
        }, done);
      }
    });
  });

  var setupModels = function(self, callback) {
    var config = self.sequelize.config;
    var execString = "node " + path.join(__dirname, "..", "bin", "sequelize-auto") + " -o \"" + testConfig.directory + "\" -d " + config.database + " -h " + config.host;

    if (_.has(config, 'username') && ! _.isNull(config.username))
      execString += " -u " + config.username + " ";
    if (_.has(config, 'password') && ! _.isNull(config.password))
      execString += " -x " + config.password + " ";
    if (_.has(config, 'port') && ! _.isNull(config.port))
      execString += " -p " + config.port + " ";
    if (_.isString(self.sequelize.options.dialect))
      execString += " -e " + self.sequelize.options.dialect + " ";

    exec(execString, callback);
  }

  describe("should be able to generate", function(){
    it("the model files...", function(done){
      var self = this;

      setupModels(self, function(err, stdout){
        expect(err).to.be.null;
        if (self.sequelize.options.dialect === "postgres") {
          expect(stdout.indexOf('SELECT table_name FROM information_schema.tables WHERE table_schema =')).to.be.at.above(-1);
          ['Users','HistoryLogs','ParanoidUsers'].forEach(function(tbl){
            expect(stdout.indexOf('SELECT tc.constraint_type as "Constraint", c.column_name as "Field", c.column_default as "Default", c.is_nullable as "Null", CASE WHEN c.udt_name = \'hstore\' THEN c.udt_name ELSE c.data_type END as "Type", (SELECT array_agg(e.enumlabel) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_enum e ON t.oid=e.enumtypid WHERE t.typname=c.udt_name) AS "special" FROM information_schema.columns c LEFT JOIN information_schema.key_column_usage cu ON c.table_name = cu.table_name AND cu.column_name = c.column_name LEFT JOIN information_schema.table_constraints tc ON c.table_name = tc.table_name AND cu.column_name = c.column_name AND tc.constraint_type = \'PRIMARY KEY\'  WHERE c.table_name = \'' + tbl + '\' AND c.table_schema = \'public\'')).to.be.at.above(-1);
            expect(stdout.indexOf('WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = \'Users\' LIMIT 1)')).to.be.at.above(-1);
            expect(stdout.indexOf('LEFT JOIN PG_STAT_ALL_INDEXES E ON F.OID = E.INDEXRELID')).to.be.at.above(-1);
            expect(stdout.indexOf('AND E.RELNAME = \'Users\'')).to.be.at.above(-1);
          });
        }
        else if (self.sequelize.options.dialect === "sqlite") {
          expect(stdout.indexOf('FROM `sqlite_master` WHERE type=\'table\'')).to.be.at.above(-1);
          expect(stdout.indexOf('PRAGMA foreign_key_list(Users);')).to.be.at.above(-1);
        }
        else if (self.sequelize.options.dialect === "mssql") {
          expect(stdout.indexOf('SELECT TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES')).to.be.at.above(-1);
          expect(stdout.indexOf('WHERE ccu.table_name = ' + helpers.Sequelize.Utils.addTicks('Users', "'"))).to.be.at.above(-1);
          expect(stdout.indexOf('JOIN syscolumns d ON b.id = d.id AND b.colid = d.colid')).to.be.at.above(-1);
          expect(stdout.indexOf('AND c.name = \'Users\'')).to.be.at.above(-1);
        } else {
          expect(stdout.indexOf('SHOW TABLES;')).to.be.at.above(-1);
          expect(stdout.indexOf('K.TABLE_NAME = \'Users\'')).to.be.at.above(-1);
          expect(stdout.indexOf('AND K.CONSTRAINT_SCHEMA = \'sequelize_auto_test\';')).to.be.at.above(-1);
          expect(stdout.indexOf('TABLE_NAME = \'Users\'')).to.be.at.above(-1);
          expect(stdout.indexOf('TABLE_SCHEMA = \'sequelize_auto_test\'')).to.be.at.above(-1);
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
      var HistoryLogs = this.sequelize.import(path.join(testConfig.directory , 'HistoryLogs'));
      var ParanoidUsers = this.sequelize.import(path.join(testConfig.directory, 'ParanoidUsers'));
      var Users = this.sequelize.import(path.join(testConfig.directory, 'Users'));

      expect(HistoryLogs.tableName).to.equal('HistoryLogs');
      ['some Text', 'aNumber', 'aRandomId', 'id'].forEach(function(field){
        expect(HistoryLogs.rawAttributes[field]).to.exist;
      });

      expect(ParanoidUsers.tableName).to.equal('ParanoidUsers');
      ['username', 'id', 'createdAt', 'updatedAt', 'deletedAt'].forEach(function(field){
        expect(ParanoidUsers.rawAttributes[field]).to.exist;
      });

      expect(Users.tableName).to.equal('Users');
      ['username', 'touchedAt', 'aNumber', 'bNumber', 'validateTest', 'validateCustom', 'dateAllowNullTrue', 'id', 'createdAt', 'updatedAt'].forEach(function(field){
        expect(Users.rawAttributes[field]).to.exist;
      });

      expect(Users.options.indexes[0]).to.include.keys(["name", "method", "fields", "type", "parser"]);
      expect(HistoryLogs.rawAttributes['some Text'].type.toString().indexOf('VARCHAR')).to.be.at.above(-1);
      expect(Users.rawAttributes.validateCustom.allowNull).to.be.false;
      expect(Users.rawAttributes.dateAllowNullTrue.allowNull).to.be.true;
      expect(Users.rawAttributes.dateAllowNullTrue.type).to.match(/time/i);

      done();
    });
  });
});
