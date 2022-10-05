import _ from "lodash";
import { addTicks, DialectOptions, FKRow } from "./dialect-options";

export const baseOptions: DialectOptions = {
  name: 'base',
  hasSchema: false,
  /**
   * @param  {String} tableName  The name of the table.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
    return '';
  },

  /**
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
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: (tableName: string, schemaName: string) => {
    return ``;
  },
  /**
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
  },

  /**
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: (record: FKRow) => {
    return (
      true
    );
  },

  showViewsQuery: () => {
    return ``;
  }

};
