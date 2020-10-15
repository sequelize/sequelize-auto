import _ from "lodash";
import { ColumnDescription, Dialect } from "sequelize/types";
import { FKSpec } from "./dialects/dialect-options";

export interface Table {
  name?: string;
  table_name: string;
  table_schema?: string;
}

export interface Field extends ColumnDescription {
  foreignKey: any;
  special: any[];
  unique: boolean;
}

export class TableData {
  tables: { [tableName: string]: { [fieldName: string]: ColumnDescription } };
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } };
  hasTriggerTables: { [tableName: string]: boolean };
  text?: { [name: string]: string };
  constructor() {
    this.tables = {};
    this.foreignKeys = {};
    this.hasTriggerTables = {};
  }
}

export function qNameSplit(qname: string) {
  if (qname.indexOf(".") > 0) {
    const [schemaName, tableNameOrig] = qname.split(".");
    return [schemaName, tableNameOrig];
  }
  return [null, qname];
}

export type CaseOption = 'c'|'l'|'o'|'p'|'u';

export interface AutoOptions {
  additional: any;
  caseFile: CaseOption;
  caseModel: CaseOption;
  caseProp: CaseOption;
  closeConnectionAutomatically: boolean;
  dialect: Dialect;
  dialectOptions: { options: any };
  directory: string;
  es6: boolean;
  esm: boolean;
  freezeTableName: boolean;
  indentation: number;
  noWrite: boolean;
  schema: string;
  skipTables: string[];
  spaces: boolean;
  storage: string;
  tables: string[];
  typescript: boolean;
}

/** Change casing of val string according to opt [c|l|o|p|u]  */
export function recase(opt: CaseOption, val: string | null) {
  if (!opt || opt === 'o' || !val) {
    return val || ''; // original
  }
  if (opt === 'c') {
    return _.camelCase(val);
  }
  if (opt === 'l') {
    return _.snakeCase(val);
  }
  if (opt === 'p') {
    return _.upperFirst(_.camelCase(val));
  }
  if (opt === 'u') {
    return _.snakeCase(val).toUpperCase();
  }
  return val;
}

