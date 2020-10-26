import _ from "lodash";
import { addTicks, countTriggerGeneric, DialectOptions, FKRow, makeCondition, showTablesGeneric } from "./dialect-options";

export const postgresOptions: DialectOptions = {
  name: 'postgres',
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
    return `SELECT DISTINCT
    tc.constraint_name as constraint_name,
    tc.constraint_type as constraint_type,
    tc.constraint_schema as source_schema,
    tc.table_name as source_table,
    kcu.column_name as source_column,
    CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.constraint_schema ELSE null END AS target_schema,
    CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.table_name ELSE null END AS target_table,
    CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.column_name ELSE null END AS target_column,
    co.column_default as extra
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name AND tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_schema = tc.constraint_schema AND ccu.constraint_name = tc.constraint_name
    JOIN information_schema.columns AS co
      ON co.table_schema = kcu.table_schema AND co.table_name = kcu.table_name AND co.column_name = kcu.column_name
    WHERE tc.table_name = ${addTicks(tableName)}
      ${makeCondition('tc.constraint_schema', schemaName)}`;
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
  isForeignKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'FOREIGN KEY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'UNIQUE';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'PRIMARY KEY';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: (record: FKRow) => {
    return (
      _.isObject(record) &&
      (_.has(record, 'extra') && _.startsWith(record.extra, 'nextval') &&
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
  showTablesQuery: (schemaName?: string) => {
    return `${showTablesGeneric(schemaName)}
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_name != 'spatial_ref_sys'`;
  }

};

