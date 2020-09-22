import { Utils } from "sequelize";


export interface DialectOptions {
  name: string;
  getForeignKeysQuery: (tableName: string, schemaName: string) => string;
  remapForeignKeysRow?: (tableName: string, row: FKRow) => FKRelation;
  countTriggerQuery: (tableName: string, schemaName: string) => string;
  isForeignKey?: (record: any) => boolean;
  isUnique?: (record: FKRow, records: FKRow[]) => boolean;
  isPrimaryKey: (record: any) => boolean;
  isSerialKey: (record: any) => boolean;
  showTablesQuery?: (tableName: string) => string;
}

export interface FKRow {
  table: string;
  id: string;
  from: string;
  to: string;
  type: string;
  primaryKey: boolean;
  extra: string;
  column_key: string;
  constraint_name: string;
  constraint_type: string;
  contype: string;
  is_identity: boolean;
}

export interface FKRelation {
  constraint_name: string;
  source_schema?: string;
  source_table: string;
  source_column: string;
  target_schema?: string;
  target_table: string;
  target_column: string;
}

export interface FKSpec extends FKRelation {
  isForeignKey: boolean;
  isSerialKey: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean | string;
  foreignSources: { [source: string]: any };
}

export function addTicks(value: any) {
  return Utils.addTicks(value, "'");
}

export function makeCondition(columnName: string, value: any) {
  return value ? ` AND ${columnName} = ${addTicks(value)} ` : "";
}

export function showTablesGeneric(schemaName: string) {
  return `SELECT table_name, table_schema
            FROM information_schema.tables
           WHERE table_type = 'BASE TABLE'
                 ${makeCondition("table_schema", schemaName)}`;
}

export function countTriggerGeneric(tableName: string, schemaName: string) {
  return `SELECT COUNT(0) AS trigger_count
            FROM information_schema.triggers AS t
           WHERE t.event_object_table = ${addTicks(tableName)}
                 ${makeCondition("t.event_object_schema", schemaName)}`;
}
