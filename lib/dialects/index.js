
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
      , C.COLUMN_KEY AS column_key \
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
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: function(record) {
    return _.isObject(record) && _.has(record, 'column_key') && record.column_key.toUpperCase() === "UNI";
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
      (SELECT d.adsrc AS extra FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid,  d.adnum) \ WHERE NOT a.attisdropped AND a.attnum > 0 AND a.attrelid = o.conrelid AND a.attnum = o.conkey[1]\ LIMIT 1) \
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
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === "u";
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
  },
  /**
   * Overwrites Sequelize's native method for showing all tables.
   * This allows custom schema support
   * @param {String} schema The schema to list all tables from
   * @return {String}
   */
  showTablesQuery: function(schema) {
    return "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + schema + "' AND table_type LIKE '%TABLE' AND table_name != 'spatial_ref_sys';";
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
  getForeignKeysQuery: function (tableName, schemaName) {
    return "SELECT \
      ccu.table_name AS source_table, \
      ccu.constraint_name AS constraint_name, \
      ccu.column_name AS source_column, \
      kcu.table_name AS target_table, \
      kcu.column_name AS target_column, \
      tc.constraint_type AS constraint_type, \
      c.is_identity AS is_identity \
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc \
    INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu \
      ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME \
    LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc \
      ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME \
    LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu \
      ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY' \
    INNER JOIN sys.COLUMNS c \
      ON c.name = ccu.column_name \
      AND c.object_id = OBJECT_ID(ccu.table_name) \
    WHERE ccu.table_name = " + sequelize.Utils.addTicks(tableName, "'");
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function (record) {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === "FOREIGN KEY";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function (record) {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === "PRIMARY KEY";
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function (record) {
    return _.isObject(record) && exports.mssql.isPrimaryKey(record) && (_.has(record, 'is_identity') &&
      record.is_identity);
  }
}
