import _ from "lodash";
import { addTicks, DialectOptions, FKRow } from "./dialect-options";

export const sqliteOptions: DialectOptions = {
  name: 'sqlite',
  hasSchema: false,
  canAliasPK: true,
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
    return `PRAGMA foreign_key_list(\`${tableName}\`);`;
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
  remapForeignKeysRow: (tableName: string, row: FKRow) => {
    return {
      constraint_name: `${tableName}_${row.id}`,
      source_schema: undefined,
      source_table: tableName,
      source_column: row.from,
      target_schema: undefined,
      target_table: row.table,
      target_column: row.to
    };
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
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
  },

  /**
   * Determines if record entry is an actual serial/auto increment key
   * For sqlite, a row is automatically AUTOINCREMENT if it is INTEGER PRIMARY KEY
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: (record: FKRow) => {
    return (
      _.isObject(record) && sqliteOptions.isPrimaryKey(record) && (record.type === 'INTEGER')
    );
  },

  showViewsQuery: () => {
    return `SELECT name FROM "sqlite_master" WHERE type='view'`;
  }

};
