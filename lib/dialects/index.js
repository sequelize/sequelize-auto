
var sequelize = require('sequelize')

exports.sqlite = {
    /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: function(tableName, schemaName) {
    return "PRAGMA foreign_key_list(" + tableName + ");"; /* jshint ignore: line */
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
    return "SELECT CONSTRAINT_NAME as constraint_name, COLUMN_NAME as source_column, REFERENCED_TABLE_SCHEMA AS target_schema, REFERENCED_TABLE_NAME AS target_table, REFERENCED_COLUMN_NAME AS target_column FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE where TABLE_NAME = '" + tableName + /* jshint ignore: line */
      "' AND CONSTRAINT_NAME!='PRIMARY' AND CONSTRAINT_SCHEMA='" + schemaName + "' AND REFERENCED_TABLE_NAME IS NOT NULL;"; /* jshint ignore: line */
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
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column \
    FROM \
      pg_constraint o LEFT JOIN pg_class c ON c.oid = o.conrelid \
      LEFT JOIN pg_class f ON f.oid = o.confrelid LEFT JOIN pg_class m ON m.oid = o.conrelid \
    WHERE \
      o.contype = \'f\' AND o.conrelid = (SELECT oid FROM pg_class WHERE relname = \'' + tableName + '\' LIMIT 1)'
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
