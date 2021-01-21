const {describe, it} = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const helpers = require('./helpers');
const dialects = require('../lib/dialects/dialects').dialects;
const _ = require('lodash');

describe(helpers.getTestDialectTeaser('sequelize-auto dialects'), function() {
  describe('getForeignKeysQuery', function() {
    it('mysql', function(done) {
      var query = dialects.mysql.getForeignKeysQuery('mytable_a', 'mydatabase_a');
      expect(query).to.include("TABLE_NAME = 'mytable_a'");
      expect(query).to.include("TABLE_SCHEMA = 'mydatabase_a'");

      query = dialects.mysql.getForeignKeysQuery('mytable_a', null);
      expect(query).to.include("TABLE_NAME = 'mytable_a'");
      expect(query).to.not.include("mydatabase_a");

      query = dialects.mysql.countTriggerQuery("mytable_a", "mydatabase_a");
      expect(query).to.include("SELECT COUNT(0) AS trigger_count");
      expect(query).to.include("EVENT_OBJECT_TABLE = 'mytable_a'");
      expect(query).to.include("EVENT_OBJECT_SCHEMA = 'mydatabase_a'");

      query = dialects.mysql.countTriggerQuery("mytable_a", null);
      expect(query).to.include("EVENT_OBJECT_TABLE = 'mytable_a'");
      expect(query).to.not.include("mydatabase_a");

      done();
    });

    it('sqlite', function(done) {
      var query = dialects.sqlite.getForeignKeysQuery('mytable_b', 'mydatabase_b');
      expect(query).to.include("PRAGMA foreign_key_list(`mytable_b`)");
      // sqlite doesn't support schemas.
      expect(query).to.not.include("mydatabase_b");

      query = dialects.sqlite.countTriggerQuery("mytable_b", "mydatabase_b");
      expect(query).to.include("SELECT COUNT(0) AS trigger_count");
      expect(query).to.include("tbl_name = 'mytable_b'");
      // sqlite doesn't support schemas.
      expect(query).to.not.include('mydatabase_b');

      done();
    });

    it('postgres', function(done) {
      var query = dialects.postgres.getForeignKeysQuery('mytable_c', 'mydatabase_c');
      expect(query).to.include("table_name = 'mytable_c'");
      expect(query).to.include("constraint_schema = 'mydatabase_c'");

      query = dialects.postgres.getForeignKeysQuery('mytable_c', null);
      expect(query).to.include("table_name = 'mytable_c'");
      expect(query).to.not.include("mydatabase_c");

      query = dialects.postgres.countTriggerQuery("mytable_c", "mydatabase_c");
      expect(query).to.include("SELECT COUNT(0) AS trigger_count");
      expect(query).to.include("event_object_table = 'mytable_c'");
      expect(query).to.include("event_object_schema = 'mydatabase_c'");

      query = dialects.postgres.countTriggerQuery("mytable_c", null);
      expect(query).to.include("event_object_table = 'mytable_c'");
      expect(query).to.not.include("event_object_schema = '");

      done();
    });

    it('mssql', function(done) {
      var query = dialects.mssql.getForeignKeysQuery('mytable_d', 'mydatabase_d');
      expect(query).to.include("TABLE_NAME = 'mytable_d'");
      expect(query).to.include("TABLE_SCHEMA = 'mydatabase_d'");

      query = dialects.mssql.getForeignKeysQuery('mytable_d', null);
      expect(query).to.include("TABLE_NAME = 'mytable_d'");
      expect(query).to.not.include("mydatabase_d");

      query = dialects.mssql.countTriggerQuery("mytable_d", "mydatabase_d");
      expect(query).to.include("SELECT COUNT(0) AS trigger_count");
      expect(query).to.include("object_id = OBJECT_ID('mydatabase_d.mytable_d')");

      query = dialects.mssql.countTriggerQuery("mytable_d", null);
      expect(query).to.include("object_id = OBJECT_ID('mytable_d')");

      done();
    });
  });

  describe('isForeignKey', function() {
    it('mysql', function(done) {
      expect(dialects.mysql.isForeignKey(null)).to.be.false;
      expect(dialects.mysql.isForeignKey({ some: 'value' })).to.be.false;
      expect(dialects.mysql.isForeignKey({ extra: 'auto_increment' })).to.be.false;
      expect(dialects.mysql.isForeignKey({ extra: 'foreign_key' })).to.be.true;
      done();
    });

    it('postgres', function(done) {
      expect(dialects.postgres.isForeignKey(null)).to.be.false;
      expect(dialects.postgres.isForeignKey({ some: 'value' })).to.be.false;
      expect(dialects.postgres.isForeignKey({ constraint_type: 'UNIQUE' })).to.be.false;
      expect(dialects.postgres.isForeignKey({ constraint_type: 'FOREIGN KEY' })).to.be.true;
      done();
    });
  });

  describe('isPrimaryKey', function() {
    it('mysql', function(done) {
      expect(dialects.mysql.isPrimaryKey(null)).to.be.false;
      expect(dialects.mysql.isPrimaryKey({ some: 'value' })).to.be.false;
      expect(dialects.mysql.isPrimaryKey({ constraint_name: 'index' })).to.be.false;
      expect(dialects.mysql.isPrimaryKey({ constraint_name: 'PRIMARY' })).to.be.true;
      done();
    });

    it('sqlite', function(done) {
      expect(dialects.sqlite.isPrimaryKey(null)).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({ some: 'value' })).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({ primaryKey: false })).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({ primaryKey: true })).to.be.true;
      done();
    });

    it('postgres', function(done) {
      expect(dialects.postgres.isPrimaryKey(null)).to.be.false;
      expect(dialects.postgres.isPrimaryKey({ some: 'value' })).to.be.false;
      expect(dialects.postgres.isPrimaryKey({ constraint_type: 'UNIQUE' })).to.be.false;
      expect(dialects.postgres.isPrimaryKey({ constraint_type: 'PRIMARY KEY' })).to.be.true;
      done();
    });
  });

  // Auto-increment key
  describe('isSerialKey', function() {
    it('mysql', function(done) {
      expect(dialects.mysql.isSerialKey(null)).to.be.false;
      expect(dialects.mysql.isSerialKey({ some: 'value' })).to.be.false;
      expect(dialects.mysql.isSerialKey({ extra: 'primary' })).to.be.false;
      expect(dialects.mysql.isSerialKey({ extra: 'auto_increment' })).to.be.true;
      done();
    });

    it('postgres', function(done) {
      expect(dialects.postgres.isSerialKey(null)).to.be.false;
      expect(dialects.postgres.isSerialKey({ some: 'value' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ extra: 'primary' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ constraint_type: 'UNIQUE' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ constraint_type: 'PRIMARY KEY' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ constraint_type: 'PRIMARY KEY', extra: null })).to.be.false;
      expect(dialects.postgres.isSerialKey({ constraint_type: 'PRIMARY KEY', extra: 'nextval(table_seq::regclass)' })).to.be.true;
      done();
    });
  });
});
