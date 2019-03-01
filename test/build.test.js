var exec = require('child_process').exec
  , path = require('path')
  , chai = require('chai')
  , expect = chai.expect
  , helpers = require('./helpers')
  , dialect = helpers.getTestDialect()
  , testConfig = require('./config')
  , _ = helpers.Sequelize.Utils._
  , lib = require('../index');

describe(helpers.getTestDialectTeaser("sequelize-auto build"), function() {
  after(function(done) {
    helpers.clearDatabase(this.sequelize, done);
  });

  before(function(done) {
    var self = this;

    helpers.initTests({
      dialect: dialect,
      beforeComplete: function(sequelize) {
        self.sequelize = sequelize;

        self.User = self.sequelize.define('User', {
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
        });

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          'some Text':  { type: helpers.Sequelize.STRING },
          'aNumber':   { type: helpers.Sequelize.INTEGER },
          'aRandomId': { type: helpers.Sequelize.INTEGER }
        });

        self.ParanoidUser = self.sequelize.define('ParanoidUser', {
          username: { type: helpers.Sequelize.STRING }
        }, {
          paranoid: true
        });

        self.ParanoidUser.belongsTo(self.User);

        self.sequelize.createSchema('test');

        self.Parent = self.sequelize.define('Parent', {
          parentId:  {
            type: helpers.Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            field: 'ParentId'
          },
          name:   { type: helpers.Sequelize.STRING, field: 'Name' }
        }, {
          timestamps: false,
          schema: 'test'
        });

        self.Child = self.sequelize.define('Child', {
          childId:  {
            type: helpers.Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            field: 'ChildId'
          },
          name:   { type: helpers.Sequelize.STRING, field: 'Name' }
        }, {
          tableName: 'Kids',
          timestamps: false,
          schema: 'test'
        });

        self.Child.belongsTo(self.Parent, { foreignKey: 'ParentId' });
        self.Child.belongsTo(self.User);
        self.Parent.belongsTo(self.User);
      },
      onComplete: function() {
        self.sequelize.sync().then(function () {
          done();
        }, done);
      }
    });
  });

  var setupModels = function(self, callback) {
    const options = _.extend({
      spaces: true,
      indentation: 2,
      logging: false,
      directory: testConfig.directory,
      dialect: helpers.getTestDialect()
    }, testConfig[helpers.getTestDialect()], self.sequelize.config);

    var autoSequelize = new lib(self.sequelize.config.database, self.sequelize.config.username, self.sequelize.config.password, options);

    autoSequelize.build(function (err) {
      callback(err, autoSequelize);
    });
  }

  describe("should be able to build", function() {
    it("the models", function(done) {
      var self = this;

      setupModels(self, function(err, autoSequelize) {
        expect(err).to.be.null;
        expect(autoSequelize).to.include.keys(['tables', 'foreignKeys']);
        expect(autoSequelize.tables).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers', 'Parents', 'Kids']);

        if (helpers.getTestDialect() === "sqlite") {
          expect(autoSequelize.foreignKeys).to.have.keys(['ParanoidUsers']);
          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['UserId']);
        } else {
          expect(autoSequelize.foreignKeys).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers', 'Parents', 'Kids']);

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
          expect(autoSequelize.foreignKeys.Parents.ParentId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'is_identity']);
          expect(autoSequelize.foreignKeys.Parents.ParentId.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Parents.ParentId.isSerialKey).to.be.true;
          expect(autoSequelize.foreignKeys.Parents.ParentId.source_schema).to.equal('test');

          expect(autoSequelize.foreignKeys.Kids).to.include.keys('ChildId');
          expect(autoSequelize.foreignKeys.Kids.ChildId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'is_identity']);
          expect(autoSequelize.foreignKeys.Kids.ChildId.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Kids.ChildId.isSerialKey).to.be.true;
          expect(autoSequelize.foreignKeys.Kids.ChildId.source_schema).to.equal('test');
        }

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isForeignKey']);

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId.isForeignKey).to.be.true;

        done();
      });
    });
  });
});
