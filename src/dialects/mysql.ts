import _ from "lodash";
import { addTicks, DialectOptions, FKRow, makeCondition } from "./dialect-options";

export const mysqlOptions: DialectOptions = {
  name: 'mysql',
  hasSchema: false,
  canAliasPK: false,
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
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
  countTriggerQuery: (tableName: string, schemaName: string) => {
    return `SELECT COUNT(0) AS trigger_count
              FROM INFORMATION_SCHEMA.TRIGGERS AS t
             WHERE t.EVENT_OBJECT_TABLE = ${addTicks(tableName)}
                  ${makeCondition("t.EVENT_OBJECT_SCHEMA", schemaName)}`;
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isForeignKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'extra') && record.extra !== 'auto_increment';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: (record: FKRow, records: FKRow[]) => {
    if (!_.isObject(record) || !_.has(record, 'column_key')) {
      return false;
    }
    return records.some(row => row.constraint_name === record.constraint_name && (row.column_key.toUpperCase() === 'UNI'));
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'constraint_name') && record.constraint_name === 'PRIMARY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'extra') && record.extra === 'auto_increment';
  },

  showViewsQuery: (dbName?: string) => {
    return `select table_name from information_schema.tables where table_type = 'VIEW' and table_schema = '${dbName}'`;
  }

};
