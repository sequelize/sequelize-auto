const { describe, before, after, it } = require('mocha');
const { exec } = require('child_process');
const debug = require('debug')('sequelize-auto:generate-tests');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const helpers = require('./helpers');
const dialect = helpers.getTestDialect();
const testConfig = require('./config');
const _ = require('lodash');

describe(helpers.getTestDialectTeaser('sequelize-auto'), function() {
  after(function(done) {
    helpers.clearDatabase(this.sequelize, done);
  });

  before(function(done) {
    const self = this;

    debug('Creating tables to run tests against.');
    helpers.initTests({
      dialect: dialect,
      beforeComplete: function(sequelize) {
        self.sequelize = sequelize;
        self.User = self.sequelize.define('User', {
          username: { type: helpers.Sequelize.STRING },
          touchedAt: { type: helpers.Sequelize.DATE, defaultValue: helpers.Sequelize.NOW },
          aNumber: { type: helpers.Sequelize.INTEGER },
          bNumber: { type: helpers.Sequelize.INTEGER },
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
        });

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          'some Text': { type: helpers.Sequelize.STRING },
          aNumber: { type: helpers.Sequelize.INTEGER },
          aRandomId: { type: helpers.Sequelize.INTEGER }
        });

        self.ParanoidUser = self.sequelize.define(
          'ParanoidUser',
          {
            username: { type: helpers.Sequelize.STRING }
          },
          {
            paranoid: true
          }
        );

        self.ParanoidUser.belongsTo(self.User);
      },
      onComplete: function() {
        self.sequelize.sync().then(function() {
          done();
        }, done);
      }
    });
  });

  const setupModels = function(self, callback) {
    const config = self.sequelize.config;
    const autoBin = path.join(__dirname, '..', 'bin', 'sequelize-auto');
    let execString = `node ${autoBin} -o "${testConfig.directory}" -d ${config.database} -h ${config.host}`;

    if (_.has(config, 'username') && !_.isNull(config.username)) {
      execString += ` -u ${config.username}`;
    }
    if (_.has(config, 'password') && !_.isNull(config.password)) {
      execString += ` -x ${config.password}`;
    }
    if (_.has(config, 'port') && !_.isNull(config.port)) {
      execString += ` -p ${config.port}`;
    }
    if (_.isString(self.sequelize.options.dialect)) {
      execString += ` -e ${self.sequelize.options.dialect}`;
    }
    debug('Starting child process:', execString);
    exec(execString, callback);
  };

  describe('should be able to generate', function() {
    it('the model files...', function(done) {
      const self = this;
      const db = self.sequelize.config.database;
      const testTables = ['Users', 'HistoryLogs', 'ParanoidUsers'];
      
      setupModels(self, function(err, stdout, stderr) {
        expect(err).to.be.null;
        if (stderr) {
          console.log(stderr);
        }
        expect(stderr).to.be.empty;

        // Cleanup whitespace and linebreaks!
        stdout = stdout.replace(/\s+/g, ' ');

        // Check the output
        if (self.sequelize.options.dialect === 'postgres') {
          const defaultSchema = 'public';
          const qry = `WHERE table_schema = '${defaultSchema}' AND table_type LIKE '%TABLE' AND table_name != 'spatial_ref_sys';`;
          expect(stdout.indexOf(qry)).to.be.at.above(-1);

          testTables.forEach(function(tbl) {
            const query = `WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = '${tbl}' LIMIT 1)`;
            expect(stdout.indexOf(query)).to.be.at.above(-1);
          });
        } else if (self.sequelize.options.dialect === 'sqlite') {
          expect(stdout.indexOf("FROM `sqlite_master` WHERE type='table'")).to.be.at.above(-1);
        } else if (self.sequelize.options.dialect === 'mssql') {
          expect(stdout.indexOf('SELECT TABLE_NAME, TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES')).to.be.at.above(-1);
        } else {
          expect(stdout.indexOf('SHOW TABLES;')).to.be.at.above(-1);

          testTables.forEach(function(tbl) {
            const query = `WHERE K.TABLE_NAME = '${tbl}' AND K.CONSTRAINT_SCHEMA = '${db}' AND C.TABLE_SCHEMA = '${db}';`
            expect(stdout.indexOf(query)).to.be.at.above(-1);
          });
        }
        done();
      });
    });
  });

  describe('should be able to require', function() {
    before(function(done) {
      const self = this;
      setupModels(self, done);
    });

    it('the model files...', function(done) {
      try {
        const historyModel = path.join(testConfig.directory, 'HistoryLogs');
        debug('Importing:', historyModel);

        const HistoryLogs = this.sequelize.import(historyModel);
        expect(HistoryLogs.tableName).to.equal('HistoryLogs');
        ['some Text', 'aNumber', 'aRandomId', 'id'].forEach(function(field) {
          expect(HistoryLogs.rawAttributes[field]).to.exist;
        });
        expect(HistoryLogs.rawAttributes['some Text'].type.toString().indexOf('VARCHAR')).to.be.at.above(-1);
      } catch (err) {
        console.log('Failed to load HistoryLogs model:', err);     
        throw err;   
      }

      try {
        const pUsers = path.join(testConfig.directory, 'ParanoidUsers');
        debug('Importing:', pUsers);

        const ParanoidUsers = this.sequelize.import(pUsers);
        expect(ParanoidUsers.tableName).to.equal('ParanoidUsers');
        ['username', 'id', 'createdAt', 'updatedAt', 'deletedAt'].forEach(function(field) {
          expect(ParanoidUsers.rawAttributes[field]).to.exist;
        });
      } catch (err) {
        console.log('Failed to load ParanoidUsers model:', err);        
        throw err;   
      }

      try {
        const users = path.join(testConfig.directory, 'Users');
        debug('Importing:', users);

        const Users = this.sequelize.import(users);
        expect(Users.tableName).to.equal('Users');
        ['username',
          'touchedAt',
          'aNumber',
          'bNumber',
          'validateTest',
          'validateCustom',
          'dateAllowNullTrue',
          'id',
          'createdAt',
          'updatedAt'].forEach(function(field) {
          expect(Users.rawAttributes[field]).to.exist;
        });
        expect(Users.rawAttributes.validateCustom.allowNull).to.be.false;
        expect(Users.rawAttributes.dateAllowNullTrue.allowNull).to.be.true;
        expect(Users.rawAttributes.dateAllowNullTrue.type).to.match(/time/i);
      } catch (err) {
        console.log('Failed to load Users model:', err);
        throw err;   
      }

      done();
    });
  });
});
