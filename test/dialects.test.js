const {describe, it} = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const helpers = require('./helpers');
const dialects = require('../lib/dialects');
const _ = require('lodash');

describe(helpers.getTestDialectTeaser('sequelize-auto dialects'), function() {
  describe('getForeignKeysQuery', function() {
    it('mysql', function(done) {
      const query = dialects.mysql.getForeignKeysQuery('mytable_a', 'mydatabase_a');
      expect(query).to.include("K.TABLE_NAME = 'mytable_a'");
      expect(query).to.include("AND K.CONSTRAINT_SCHEMA = 'mydatabase_a'");
      expect(query).to.include("AND C.TABLE_SCHEMA = 'mydatabase_a'");
      done();
    });

    it('sqlite', function(done) {
      const query = dialects.sqlite.getForeignKeysQuery('mytable_b', 'mydatabase_b');
      expect(query).to.include('PRAGMA foreign_key_list(mytable_b);');
      // sqlite doesn't know schemas.
      const query2 = dialects.sqlite.getForeignKeysQuery('mytable_xyz');
      expect(query2).to.include('PRAGMA foreign_key_list(mytable_xyz);');
      done();
    });

    it('postgres', function(done) {
      const query = dialects.postgres.getForeignKeysQuery('mytable_c', 'mydatabase_c');
      expect(query).to.include("WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = 'mytable_c' LIMIT 1)");
      done();
    });

    it('mssql', function(done) {
      const query = dialects.mssql.getForeignKeysQuery('mytable_d', 'mydatabase_d');
      expect(query).to.include('WHERE ccu.table_name = ' + helpers.Sequelize.Utils.addTicks('mytable_d', "'"));
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
      expect(dialects.postgres.isForeignKey({ contype: 't' })).to.be.false;
      expect(dialects.postgres.isForeignKey({ contype: 'f' })).to.be.true;
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
      expect(dialects.postgres.isPrimaryKey({ contype: 'f' })).to.be.false;
      expect(dialects.postgres.isPrimaryKey({ contype: 'p' })).to.be.true;
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
      expect(dialects.postgres.isSerialKey({ contype: 'i' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ contype: 'p' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ contype: 'p', extra: null })).to.be.false;
      expect(dialects.postgres.isSerialKey({ contype: 'p', extra: 'primary' })).to.be.false;
      expect(dialects.postgres.isSerialKey({ contype: 'p', extra: 'nextval(table_seq::regclass)' })).to.be.true;
      done();
    });
  });
});
