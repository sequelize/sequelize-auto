import _ from "lodash";
import { addTicks, DialectOptions, FKRow, makeCondition } from "./dialect-options";

export const mssqlOptions: DialectOptions = {
  name: 'mssql',
  hasSchema: true,
  canAliasPK: false,
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
    return `SELECT ccu.TABLE_NAME AS source_table,
                   ccu.CONSTRAINT_NAME AS constraint_name,
                   ccu.CONSTRAINT_SCHEMA AS source_schema,
                   ccu.COLUMN_NAME AS source_column,
                   kcu.TABLE_NAME AS target_table,
                   kcu.TABLE_SCHEMA AS target_schema,
                   kcu.COLUMN_NAME AS target_column,
                   tc.CONSTRAINT_TYPE AS constraint_type,
                   c.IS_IDENTITY AS is_identity
              FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
              LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
              LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
               AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
             INNER JOIN sys.columns c
                ON c.name = ccu.COLUMN_NAME
               AND c.object_id = OBJECT_ID(ccu.TABLE_SCHEMA + '.' + ccu.TABLE_NAME)
             WHERE tc.CONSTRAINT_TYPE != 'CHECK'
               AND ccu.TABLE_NAME = ${addTicks(tableName)}
                   ${makeCondition('ccu.TABLE_SCHEMA', schemaName)}`;
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
    // NOTE: MS SQL Server does not support information_schema.triggers as of August 2019.
    // https://docs.microsoft.com/en-us/sql/relational-databases/system-information-schema-views/system-information-schema-views-transact-sql
    // When it is supported, countTriggerGeneric() could be used instead, but it is better
    // to keep backwards compatibility.
    const qname = addTicks((schemaName ? schemaName + "." : "") + tableName);
    return `SELECT COUNT(0) AS trigger_count
              FROM sys.objects tr,  sys.objects tb
             WHERE tr.type = 'TR'
               AND tr.parent_object_id = tb.object_id
               AND tb.object_id = OBJECT_ID(${qname})`;
  },
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
  isUnique: (record: FKRow, records: FKRow[]) => {
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
      _.isObject(record) && mssqlOptions.isPrimaryKey(record) && (_.has(record, 'is_identity') && record.is_identity)
    );
  },
  /**
   * Override Sequelize's method for showing all tables to allow schema support.
   * See sequelize/lib/dialects/mssql/query-generator.js:showTablesQuery()
   * @param {String} schemaName Optional. The schema from which to list tables.
   * @return {String}
   */
  showTablesQuery: (schemaName?: string) => {
    return `SELECT TABLE_NAME AS table_name, TABLE_SCHEMA AS table_schema
              FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME != 'sysdiagrams'
                   ${makeCondition("TABLE_SCHEMA", schemaName)}`;
  },

  showViewsQuery: (schemaName?: string) => {
    return `SELECT TABLE_NAME AS table_name, TABLE_SCHEMA AS table_schema
              FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_TYPE = 'VIEW'
                  ${makeCondition("TABLE_SCHEMA", schemaName)}`;
  },

  /** Sequelize "describeTable" doesn't include precision and scale in mssql */
  showPrecisionQuery: (tableName: string, schemaName?: string) => {
    return `SELECT COLUMN_NAME AS column_name, NUMERIC_PRECISION AS numeric_precision, NUMERIC_SCALE AS numeric_scale
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'` + (!schemaName ? '' : ` AND TABLE_SCHEMA = '${schemaName}'`);
  },


};
