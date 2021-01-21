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
const ESLint = require('eslint').ESLint;


describe(helpers.getTestDialectTeaser('sequelize-auto generate'), function() {
  var self = this;
  self.timeout(10000);

  after(function(done) {
    helpers.clearDatabase(self.sequelize, done, true);
  });

  before(function(done) {
    debug('Creating tables to run tests against.');
    helpers.initTestData(self, dialect, done);
  });

  function setupModels(callback) {
    const config = self.sequelize.config;
    const autoBin = path.join(__dirname, '..', 'bin', 'sequelize-auto');
    try {
      let execString = `node ${autoBin} -o "${testConfig.directory}" -d ${config.database} -h ${config.host}`;
      if (_.has(config, 'username') && !_.isNull(config.username)) {
        execString += ` -u ${config.username}`;
      }
      if (_.has(config, 'password') && config.password != null) {
        execString += ` -x ${config.password}`;
      }
      if (_.has(config, 'port') && !_.isNull(config.port)) {
        execString += ` -p ${config.port}`;
      }
      if (_.isString(self.sequelize.options.dialect)) {
        execString += ` -e ${self.sequelize.options.dialect}`;
      }
      if (helpers.views) {
        execString += ' -v'; // test view generation
      }
      // execString += ' -l es6'; // uncomment to test es6 file generation
      if (helpers.isSnakeTables()) {
        execString += ' --cm p --cf p'; // test PascalCase conversion from snake_case tables
      }
      debug('Starting child process:', execString);
      exec(execString, callback);
    } catch (err) {
      callback(err);
    }
  };

  describe('should be able to generate', function() {
    it('the model files.', function(done) {
      try {
        const db = self.sequelize.config.database;
        var testTables = ['Users', 'HistoryLogs', 'ParanoidUsers'];
        if (helpers.isSnakeTables()) {
          testTables = testTables.map(t => _.snakeCase(t));
        }

        setupModels(function(err, stdout, stderr) {
          if (err) return done(err);

          // console.log('------------');
          // console.log('Error::', err);
          // console.log('stdout::', stdout);
          // console.log('------------');

          if (stderr) {
            console.log(stderr);
          }
          expect(stderr).to.be.empty;

          // Cleanup whitespace and linebreaks!
          stdout = stdout.replace(/\s+/g, ' ');

          debug('Checking the output for', self.sequelize.options.dialect);

          try {
            // Check the output
            if (self.sequelize.options.dialect === 'postgres') {
              expect(stdout.indexOf('SELECT table_name, table_schema FROM information_schema.tables')).to.be.at.above(-1);

              testTables.forEach(function(tbl) {
                const query = `tc.table_name = '${tbl}'`;
                expect(stdout.indexOf(query)).to.be.at.above(-1);
              });
            } else if (self.sequelize.options.dialect === 'sqlite') {
              expect(stdout.indexOf("FROM `sqlite_master` WHERE type='table'")).to.be.at.above(-1);
            } else if (self.sequelize.options.dialect === 'mssql') {
              expect(stdout.indexOf('SELECT TABLE_NAME AS table_name, TABLE_SCHEMA AS table_schema FROM INFORMATION_SCHEMA.TABLES')).to.be.at.above(-1);
              testTables.forEach(function(tbl) {
                expect(stdout.indexOf(`TABLE_NAME = '${tbl}'`)).to.be.at.above(-1);
              });
            } else {
              expect(stdout.indexOf('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE')).to.be.at.above(-1);

              testTables.forEach(function(tbl) {
                const query = `WHERE K.TABLE_NAME = '${tbl}'`; // AND C.TABLE_SCHEMA = '${db}';`
                const queryPos = stdout.indexOf(query);
                debug('mysql queryPos:', queryPos, 'query:', query);
                expect(queryPos).to.be.at.above(-1);
              });
            }
          } catch (err) {
            console.log("Error checking stdout:", err);
            return done(err);
          }

          debug('Linting output for', self.sequelize.options.dialect);

          const engine = new ESLint({fix: true});
          engine.lintFiles(testConfig.directory).then(r => {
            const errs = ESLint.getErrorResults(r);
            console.dir(errs, {depth: 3});
            return ESLint.outputFixes(r);
          }).finally(_ => done());

          // done();
        });
      } catch (err) {
        console.log("Ack:", err);
        return done(err);
      }
    });
  });

  describe('should be able to require', function() {
    before(setupModels);
    const isSnakeTables = helpers.isSnakeTables();

    it('the HistoryLogs model', function(done) {
      try {
        const historyModel = path.join(testConfig.directory, 'HistoryLogs');
        debug('Importing:', historyModel);

        const HistoryLogs = self.sequelize.import ? self.sequelize.import(historyModel) : require(historyModel)(self.sequelize, helpers.Sequelize);
        const tableName = isSnakeTables ? 'history_logs' : 'HistoryLogs';
        expect(HistoryLogs.tableName).to.equal(tableName);
        expect(HistoryLogs.options.hasTrigger).to.equal(true);      
        ['some Text', '1Number', 'aRandomId', 'id'].forEach(function(field) {
          expect(HistoryLogs.rawAttributes[field], field).to.exist;
        });
        expect(HistoryLogs.rawAttributes['some Text'].type.toString().indexOf('VARCHAR')).to.be.at.above(-1);
        done();
      } catch (err) {
        console.log('Failed to load HistoryLogs model:', err);
        done(err);
      }
    });

    it('the ParanoidUsers model', function(done) {
      try {
        const pUsers = path.join(testConfig.directory, 'ParanoidUsers');
        debug('Importing:', pUsers);

        const ParanoidUsers = self.sequelize.import ? self.sequelize.import(pUsers) : require(pUsers)(self.sequelize, helpers.Sequelize);
        const tableName = isSnakeTables ? 'paranoid_users' : 'ParanoidUsers';
        expect(ParanoidUsers.tableName).to.equal(tableName);
        expect(ParanoidUsers.options).to.not.have.property("hasTrigger");
        ['username', 'id', 'createdAt', 'updatedAt', 'deletedAt'].forEach(function(field) {
          expect(ParanoidUsers.rawAttributes[field]).to.exist;
        });
        done();
      } catch (err) {
        console.log('Failed to load ParanoidUsers model:', err);
        done(err);
      }
    });

    it('the Users model', function(done) {
      try {
        const users = path.join(testConfig.directory, 'Users');
        debug('Importing:', users);

        const Users = self.sequelize.import ? self.sequelize.import(users) : require(users)(self.sequelize, helpers.Sequelize);
        const tableName = isSnakeTables ? 'users' : 'Users';
        const raw = Users.rawAttributes;
        expect(Users.tableName).to.equal(tableName);
        expect(Users.options).to.not.have.property("hasTrigger");
        ['username',
          'touchedAt',
          'aNumber',
          'bNumber',
          'validateTest',
          'validateCustom',
          'dateAllowNullTrue',
          'defaultValueBoolean',
          'id',
          'createdAt',
          'updatedAt'].forEach(function(field) {
          expect(raw[field]).to.exist;
        });
        expect(raw.id.autoIncrement).to.be.true;
        expect(raw.validateTest.allowNull).to.be.true;
        expect(raw.validateCustom.allowNull).to.be.false;
        expect(raw.dateAllowNullTrue.allowNull).to.be.true;
        expect(raw.dateAllowNullTrue.type).to.match(/time/i);
        expect(raw.defaultValueBoolean.defaultValue).to.be.equal(dialect == 'mysql' ? 1 : true);
        expect(raw.bNumber.defaultValue).to.be.equal(42);
        const dateDefault = JSON.stringify(raw.dateWithDefault.defaultValue);
        const databaseMajorVersion = +((self.sequelize.options.databaseVersion || '').split('.')[0]);
        expect(dateDefault).to.be.equal(dialect == 'mssql' ? '{"fn":"getdate","args":[]}' : 
          (dialect == 'postgres' && databaseMajorVersion < 10) ? '{"fn":"now","args":[]}' :
          '{"val":"CURRENT_TIMESTAMP"}');
        done();
      } catch (err) {
        console.log('Failed to load Users model:', err);
        done(err);
      }
    });

    it('the VHistory model', function(done) {
      if (!helpers.views) {
        return done();
      }
      try {
        const vpath = path.join(testConfig.directory, 'VHistory');
        debug('Importing:', vpath);

        const vHist = self.sequelize.import ? self.sequelize.import(vpath) : require(vpath)(self.sequelize, helpers.Sequelize);
        const tableName = isSnakeTables ? 'v_history' : 'VHistory';
        const raw = vHist.rawAttributes;
        expect(vHist.tableName).to.equal(tableName);
        expect(vHist.options).to.not.have.property("hasTrigger");
        expect(raw['aRandomId'], 'aRandomId').to.exist;
        done();
      } catch (err) {
        console.log('Failed to load VHistory model:', err);
        done(err);
      }
    });
    
    it('the Users model CRUD', function(done) {
      try {
        const users = path.join(testConfig.directory, 'Users');
        debug('Importing:', users);

        const Users = self.sequelize.import ? self.sequelize.import(users) : require(users)(self.sequelize, helpers.Sequelize);

        // crude date offset to account for difference between database time and sequelize UTC time.
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        Users.create({
          username: 'janedoe',
          aNumber: 120,
          bNumber: 5,
          validateTest: 888888888,
          validateCustom: 'custom?',
          dateAllowNullTrue: null
        }).then(function(u) {
          return u.reload().then(function(jane) {
            expect(jane.username).to.be.equal('janedoe');
            expect(jane.validateTest).to.be.equal(888888888);
            expect(jane.dateWithDefault).to.be.greaterThan(yesterday);
            expect(jane.defaultValueBoolean).to.be.equal(dialect == 'mysql' || dialect == 'sqlite' ? 1 : true);
            done();
          });
        }).catch(function(err) {
          done(err);
        });

      } catch (err) {
        console.log('Failed to CRUD Users model:', err);
        done(err);
      }

    });
  });
});
