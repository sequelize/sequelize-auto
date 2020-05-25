
var chai = require('chai');
var expect = chai.expect;
var helpers = require('./helpers');
var dialect = helpers.getTestDialect();

var dialects = require('../lib/dialects');

describe(helpers.getTestDialectTeaser('sequelize-auto dialects'), function() {
 
  describe('isForeignKey', function () {
    it('mysql', function (done) {
      expect(dialects.mysql.isForeignKey(null)).to.be.false;
      expect(dialects.mysql.isForeignKey({some: 'value'})).to.be.false;
      expect(dialects.mysql.isForeignKey({extra: 'auto_increment'})).to.be.false;
      expect(dialects.mysql.isForeignKey({extra: 'foreign_key'})).to.be.true;
      done();
    });

    it('postgres', function (done) {
      expect(dialects.postgres.isForeignKey(null)).to.be.false;
      expect(dialects.postgres.isForeignKey({some: 'value'})).to.be.false;
      expect(dialects.postgres.isForeignKey({contype: 't'})).to.be.false;
      expect(dialects.postgres.isForeignKey({contype: 'f'})).to.be.true;
      done();
    });
  });

  describe('isPrimaryKey', function () {
    it('mysql', function (done) {
      expect(dialects.mysql.isPrimaryKey(null)).to.be.false;
      expect(dialects.mysql.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.mysql.isPrimaryKey({constraint_name: 'index'})).to.be.false;
      expect(dialects.mysql.isPrimaryKey({constraint_name: 'PRIMARY'})).to.be.true;
      done();
    });

    it('sqlite', function (done) {
      expect(dialects.sqlite.isPrimaryKey(null)).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({primaryKey: false})).to.be.false;
      expect(dialects.sqlite.isPrimaryKey({primaryKey: true})).to.be.true;
      done();
    });

    it('postgres', function (done) {
      expect(dialects.postgres.isPrimaryKey(null)).to.be.false;
      expect(dialects.postgres.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.postgres.isPrimaryKey({contype: 'f'})).to.be.false;
      expect(dialects.postgres.isPrimaryKey({contype: 'p'})).to.be.true;
      done();
    });
  });

  describe('isSerialKey', function () {
    it('mysql', function (done) {
      expect(dialects.mysql.isSerialKey(null)).to.be.false;
      expect(dialects.mysql.isSerialKey({some: 'value'})).to.be.false;
      expect(dialects.mysql.isSerialKey({extra: 'primary'})).to.be.false;
      expect(dialects.mysql.isSerialKey({extra: 'auto_increment'})).to.be.true;
      done();
    });

    it('postgres', function (done) {
      expect(dialects.postgres.isSerialKey(null)).to.be.false;
      expect(dialects.postgres.isSerialKey({some: 'value'})).to.be.false;
      expect(dialects.postgres.isSerialKey({extra: 'primary'})).to.be.false;
      expect(dialects.postgres.isSerialKey({contype: 'i'})).to.be.false;
      expect(dialects.postgres.isSerialKey({contype: 'p'})).to.be.false;
      expect(dialects.postgres.isSerialKey({contype: 'p', extra: null})).to.be.false;
      expect(dialects.postgres.isSerialKey({contype: 'p', extra: 'primary'})).to.be.false;
      expect(dialects.postgres.isSerialKey({contype: 'p', extra: 'nextval(table_seq::regclass)'})).to.be.true;
      done();
    });
  });
});
