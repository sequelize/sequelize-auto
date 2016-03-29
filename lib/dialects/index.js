
var sequelize = require('sequelize')
var _ = sequelize.Utils._;

exports.sqlite = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return "PRAGMA foreign_key_list(" + tableName + ");";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function (record) {
    return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
  }
}

exports.mysql = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return "SELECT \
        K.CONSTRAINT_NAME as constraint_name \
      , K.CONSTRAINT_SCHEMA as source_schema \
      , K.TABLE_SCHEMA as source_table \
      , K.COLUMN_NAME as source_column \
      , K.REFERENCED_TABLE_SCHEMA AS target_schema \
      , K.REFERENCED_TABLE_NAME AS target_table \
      , K.REFERENCED_COLUMN_NAME AS target_column \
      , C.extra \
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K \
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS C \
        ON C.TABLE_NAME = K.TABLE_NAME AND C.COLUMN_NAME = K.COLUMN_NAME \
      WHERE \
        K.TABLE_NAME = '" + tableName + "' \
        AND K.CONSTRAINT_SCHEMA = '" + schemaName + "';";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function(record) {
    return _.isObject(record) && _.has(record, 'extra') && record.extra !== "auto_increment";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'constraint_name') && record.constraint_name === "PRIMARY";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return _.isObject(record) && _.has(record, 'extra') && record.extra === "auto_increment";
  }
}

exports.mariadb = exports.mysql

exports.postgres = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return 'SELECT \
      o.conname AS constraint_name, \
      (SELECT nspname FROM pg_namespace WHERE oid=m.relnamespace) AS source_schema, \
      m.relname AS source_table, \
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column, \
      (SELECT nspname FROM pg_namespace WHERE oid=f.relnamespace) AS target_schema, \
      f.relname AS target_table, \
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column, \
      o.contype, \
      (SELECT d.adsrc AS extra FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid,  d.adnum) \ WHERE NOT a.attisdropped AND a.attnum > 0 AND a.attrelid = o.conrelid \ LIMIT 1) \
    FROM pg_constraint o \
    LEFT JOIN pg_class c ON c.oid = o.conrelid \
    LEFT JOIN pg_class f ON f.oid = o.confrelid \
    LEFT JOIN pg_class m ON m.oid = o.conrelid \
    WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = \'' + tableName + '\' LIMIT 1)'
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === "f";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === "p";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return _.isObject(record) && exports.postgres.isPrimaryKey(record) && (_.has(record, 'extra') &&
          _.startsWith(record.extra, 'nextval')
        && _.includes(record.extra, '_seq')
        && _.includes(record.extra, '::regclass'));
  }
}

exports.mssql = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return 'SELECT \
        ccu.table_name AS source_table \
        ,ccu.constraint_name AS constraint_name \
        ,ccu.column_name AS source_column \
        ,kcu.table_name AS target_table \
        ,kcu.column_name AS target_column \
      FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu \
      INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc \
          ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME \
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu  \
          ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME \
          WHERE ccu.table_name = ' + sequelize.Utils.addTicks(tableName, "'");
  }
}
