const sequelize = require('sequelize');
const _ = require('lodash');

function addTicks(value) {
  return sequelize.Utils.addTicks(value, "'");
}

function makeCondition(columnName, value) {
  return value ? ` AND ${columnName} = ${addTicks(value)} ` : "";
}

function showTablesGeneric(schemaName) {
  return `SELECT table_name, table_schema
            FROM information_schema.tables
           WHERE table_type = 'BASE TABLE'
                 ${makeCondition("table_schema", schemaName)}`;
}

function countTriggerGeneric(tableName, schemaName) {
  return `SELECT COUNT(0) AS trigger_count
            FROM information_schema.triggers AS t
           WHERE t.event_object_table = ${addTicks(tableName)}
                 ${makeCondition("t.event_object_schema", schemaName)}`;
}

exports.sqlite = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName) {
    return `PRAGMA foreign_key_list(${tableName});`;
  },

  /**
   * In SQLITE, PRAGMAs are isolated statement that cannot be run as subqueries.
   * In SQLite 3.16.0 there are PRAGMA functions which can be used in a subquery,
   * but sequelize-auto for now aims to support as many versions as possible,
   * so it does not rely on that feature. As such getForeignKeysQuery() can
   * only contain a PRAGMA statement and the result set needs to be reformatted
   * elsewhere, by this function.
   * @param  {String} tableName  The name of the table.
   * @param  {Object} row  One of the rows of the result set from getForeignKeysQuery().
   */
  remapForeignKeysRow: function(tableName, row) {
      return {
        constraint_name: `${tableName}_${row.id}`,
        source_schema: null,
        source_table: tableName ,
        source_column: row.from,
        target_schema: null,
        target_table: row.table,
        target_column: row.to
      }
  },

  /**
   * Generates an SQL query that tells if this table has triggers or not. The
   * result set returns the total number of triggers for that table. If 0, the
   * table has no triggers.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: function (tableName, schemaName) {
    return `SELECT COUNT(0) AS trigger_count
              FROM sqlite_master
             WHERE type = 'trigger'
               AND tbl_name = ${addTicks(tableName)}`;
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
  },

  /**
   * Determines if record entry is an actual serial/auto increment key
   * For sqlite, a row is automatically AUTOINCREMENT if it is INTEGER PRIMARY KEY
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return (
      _.isObject(record) && exports.sqlite.isPrimaryKey(record) && (record.type === 'INTEGER')
    );
  },

};

exports.mysql = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return `SELECT K.CONSTRAINT_NAME as constraint_name
      , K.CONSTRAINT_SCHEMA as source_schema
      , K.TABLE_NAME as source_table
      , K.COLUMN_NAME as source_column
      , K.REFERENCED_TABLE_SCHEMA AS target_schema
      , K.REFERENCED_TABLE_NAME AS target_table
      , K.REFERENCED_COLUMN_NAME AS target_column
      , C.EXTRA AS extra
      , C.COLUMN_KEY AS column_key
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS C
        ON C.TABLE_NAME = K.TABLE_NAME AND C.COLUMN_NAME = K.COLUMN_NAME AND C.TABLE_SCHEMA = K.CONSTRAINT_SCHEMA
      WHERE K.TABLE_NAME = ${addTicks(tableName)}
            ${makeCondition('C.TABLE_SCHEMA', schemaName)}`;
  },

  /**
   * Generates an SQL query that tells if this table has triggers or not. The
   * result set returns the total number of triggers for that table. If 0, the
   * table has no triggers.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: countTriggerGeneric,
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function(record) {
    return _.isObject(record) && _.has(record, 'extra') && record.extra !== 'auto_increment';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: function(record) {
    return _.isObject(record) && _.has(record, 'column_key') && record.column_key.toUpperCase() === 'UNI';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'constraint_name') && record.constraint_name === 'PRIMARY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return _.isObject(record) && _.has(record, 'extra') && record.extra === 'auto_increment';
  }
};

exports.mariadb = exports.mysql;

exports.postgres = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return `SELECT
      o.conname AS constraint_name,
      (SELECT nspname FROM pg_namespace WHERE oid=m.relnamespace) AS source_schema,
      m.relname AS source_table,
      (SELECT a.attname FROM pg_attribute a
        WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column,
      (SELECT nspname FROM pg_namespace WHERE oid=f.relnamespace) AS target_schema,
      f.relname AS target_table,
      (SELECT a.attname FROM pg_attribute a
        WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column,
      o.contype,
      (SELECT pg_get_expr(d.adbin, d.adrelid) AS extra FROM pg_catalog.pg_attribute a
        LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid,  d.adnum)
        WHERE NOT a.attisdropped AND a.attnum > 0 AND a.attrelid = o.conrelid AND a.attnum = o.conkey[1] LIMIT 1)
    FROM pg_constraint o
    LEFT JOIN pg_class c ON c.oid = o.conrelid
    LEFT JOIN pg_class f ON f.oid = o.confrelid
    LEFT JOIN pg_class m ON m.oid = o.conrelid
    WHERE o.conrelid IN (
        SELECT t.oid
          FROM pg_class t, pg_catalog.pg_namespace n
         WHERE n.oid = t.relnamespace
           AND t.relname = ${addTicks(tableName)}
               ${makeCondition('n.nspname', schemaName)})`;
  },

  /**
   * Generates an SQL query that tells if this table has triggers or not. The
   * result set returns the total number of triggers for that table. If 0, the
   * table has no triggers.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: countTriggerGeneric,
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'f';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'u';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'p';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return (
      _.isObject(record) &&
      exports.postgres.isPrimaryKey(record) &&
      (_.has(record, 'extra') &&
        _.startsWith(record.extra, 'nextval') &&
        _.includes(record.extra, '_seq') &&
        _.includes(record.extra, '::regclass'))
    );
  },
  /**
   * Override Sequelize's method for showing all tables to allow schema support.
   * See sequelize/lib/dialects/postgres/query-generator.js:showTablesQuery()
   * @param {String} schemaName Optional. The schema from which to list tables.
   * @return {String}
   */
  showTablesQuery: function(schemaName) {
    return `${showTablesGeneric(schemaName)}
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_name != 'spatial_ref_sys'`;
  }
};

exports.mssql = {
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return `SELECT ccu.table_name AS source_table,
                   ccu.constraint_name AS constraint_name,
                   ccu.constraint_schema AS source_schema,
                   ccu.column_name AS source_column,
                   kcu.table_name AS target_table,
                   kcu.table_schema AS target_schema,
                   kcu.column_name AS target_column,
                   tc.constraint_type AS constraint_type,
                   c.is_identity AS is_identity
              FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
              LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
              LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
               AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
             INNER JOIN sys.COLUMNS c
                ON c.name = ccu.column_name
               AND c.object_id = OBJECT_ID(ccu.TABLE_SCHEMA + '.' + ccu.TABLE_NAME)
             WHERE tc.constraint_type != 'CHECK'
               AND ccu.table_name = ${addTicks(tableName)}
                   ${makeCondition('ccu.table_schema', schemaName)}`;
  },

  /**
   * Generates an SQL query that tells if this table has triggers or not. The
   * result set returns the total number of triggers for that table. If 0, the
   * table has no triggers.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: function (tableName, schemaName) {
    // NOTE: MS SQL Server does not support information_schema.triggers as of August 2019.
    // https://docs.microsoft.com/en-us/sql/relational-databases/system-information-schema-views/system-information-schema-views-transact-sql
    // When it is supported, countTriggerGeneric() could be used instead, but it is better
    // to keep backwards compatibility.
    var qname = sequelize.Utils.addTicks((schemaName ? schemaName + "." : "") + tableName, "'")
    return `SELECT COUNT(0) AS trigger_count
              FROM sys.objects tr,  sys.objects tb
             WHERE tr.type = 'TR'
               AND tr.parent_object_id = tb.object_id
               AND tb.object_id = object_id(${qname})`;
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: function(record) {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'FOREIGN KEY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: function(record) {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'PRIMARY KEY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: function(record) {
    return (
      _.isObject(record) && exports.mssql.isPrimaryKey(record) && (_.has(record, 'is_identity') && record.is_identity)
    );
  },
  /**
   * Override Sequelize's method for showing all tables to allow schema support.
   * See sequelize/lib/dialects/mssql/query-generator.js:showTablesQuery()
   * @param {String} schemaName Optional. The schema from which to list tables.
   * @return {String}
   */
  showTablesQuery: showTablesGeneric
};
