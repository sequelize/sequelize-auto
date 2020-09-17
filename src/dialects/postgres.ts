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
  isForeignKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'f';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isUnique: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'u';
  },

  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'contype') && record.contype === 'p';
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
      postgresOptions.isPrimaryKey(record) &&
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
  showTablesQuery: (schemaName: string) => {
    return `${showTablesGeneric(schemaName)}
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_name != 'spatial_ref_sys'`;
  }

};

