import _ from "lodash";
import { addTicks, DialectOptions, FKRow, makeCondition } from "./dialect-options";

export const postgresOptions: DialectOptions = {
  name: 'postgres',
  hasSchema: true,
  canAliasPK: true,
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
    co.column_default as extra,
    co.identity_generation as generation
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
  countTriggerQuery: (tableName: string, schemaName: string) => {
    return `SELECT COUNT(0) AS trigger_count
              FROM information_schema.triggers AS t
             WHERE t.event_object_table = ${addTicks(tableName)}
                  ${makeCondition("t.event_object_schema", schemaName)}`;
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
  isSerialKey: (record: { extra: string, defaultValue: string, generation: string; }) => {
    const isSequence = (val: string) => !!val && ((_.startsWith(val, 'nextval') && _.includes(val, '_seq') && _.includes(val, '::regclass')) || (val === 'ALWAYS' || val === 'BY DEFAULT'));
    return (
      _.isObject(record) && (isSequence(record.extra) || isSequence(record.defaultValue) || isSequence(record.generation))
    );
  },
  /**
   * Override Sequelize's method for showing all tables to allow schema support.
   * See sequelize/lib/dialects/postgres/query-generator.js:showTablesQuery()
   * @param {String} schemaName Optional. The schema from which to list tables.
   * @return {String}
   */
  showTablesQuery: (schemaName?: string) => {
    return `SELECT table_name, table_schema
              FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_name != 'spatial_ref_sys'
              ${makeCondition("table_schema", schemaName)}`;
  },

  showViewsQuery: (schemaName?: string) => {
    return `SELECT table_name, table_schema
             FROM information_schema.tables
            WHERE table_type = 'VIEW'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
              ${makeCondition("table_schema", schemaName)}`;
  },

  /** Get the element type for ARRAY and USER-DEFINED data types */
  showElementTypeQuery: (tableName: string, schemaName?: string) => {
    return `SELECT c.column_name, c.data_type, c.udt_name, e.data_type AS element_type,
    (SELECT array_agg(pe.enumlabel) FROM pg_catalog.pg_type pt JOIN pg_catalog.pg_enum pe ON pt.oid=pe.enumtypid
 	    WHERE pt.typname=c.udt_name OR CONCAT('_',pt.typname)=c.udt_name) AS enum_values
    FROM information_schema.columns c LEFT JOIN information_schema.element_types e
     ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
       = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
    WHERE c.table_name = '${tableName}'` + (!schemaName ? '' : ` AND c.table_schema = '${schemaName}'`);
  },

  showGeographyTypeQuery: (tableName: string, schemaName?: string) => {
    return `SELECT f_geography_column AS column_name, type AS udt_name, srid AS data_type, coord_dimension AS element_type
    FROM geography_columns
    WHERE f_table_name = '${tableName}'` + (!schemaName ? '' : ` AND f_table_schema = '${schemaName}'`);
  },

  showGeometryTypeQuery: (tableName: string, schemaName?: string) => {
    return `SELECT f_geometry_column AS column_name, type AS udt_name, srid AS data_type, coord_dimension AS element_type
    FROM geometry_columns
    WHERE f_table_name = '${tableName}'` + (!schemaName ? '' : ` AND f_table_schema = '${schemaName}'`);
  }

};

