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

/** Language of output model files */
export declare type LangOption = "es5" | "es6" | "esm" | "ts";

/** "c" camelCase |
 * "l" lower_case |
 * "o" original (db) |
 * "p" PascalCase |
 * "u" UPPER_CASE */
export declare type CaseOption = "c" | "l" | "o" | "p" | "u";

export interface AutoOptions {
  additional?: any;
  /** Case of file names */
  caseFile?: CaseOption;
  /** Case of model names */
  caseModel?: CaseOption;
  /** Case of property names */
  caseProp?: CaseOption;
  /** Close connection after export (default true) */
  closeConnectionAutomatically?: boolean;
  /** Database dialect */
  dialect?: Dialect;
  /** Dialect-specific options */
  dialectOptions?: { options?: any };
  /** Where to write the model files */
  directory: string;
  freezeTableName?: boolean;
  /** Database host */
  host?: string;
  /** Number of spaces or tabs to indent (default 2) */
  indentation?: number;
  /** Model language */
  lang: LangOption;
  /** Whether to skip writing the files */
  noWrite?: boolean;
  /** Database port */
  port?: number;
  /** Database schema to export */
  schema?: string;
  /** Tables to skip exporting */
  skipTables?: string[];
  /** Whether to indent with spaces instead of tabs (default true) */
  spaces?: boolean;
  /** File where database is stored (sqlite only) */
  storage?: string;
  /** Tables to export (default all) */
  tables?: string[];
}

/** Change casing of val string according to opt [c|l|o|p|u]  */
export function recase(opt: CaseOption | undefined, val: string | null) {
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

