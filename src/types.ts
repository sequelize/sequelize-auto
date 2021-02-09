import _ from "lodash";
import { Utils } from "sequelize";
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
  elementType: string;
  unique: boolean;
}

export interface IndexField {
  /** field name */
  attribute: string;
  collate: string;
  length: string;
  order: string;
}

export interface IndexSpec {
  /** name of index */
  name: string;
  /** whether index is primary key */
  primary: boolean;
  unique: boolean;
  fields: IndexField[];

  /** postgres only */
  indkey: string;
  /** postgres only */
  definition: string;

  /** mysql only */
  tableName: string;
  /** mysql only - 'BTREE' */
  type: string;

}

/** Relationship between two models, based on foreign keys */
export interface Relation {
  /** name of parent table, e.g. customers */
  parentTable: string;
  /** name of parent class, e.g. Customer */
  parentModel: string;
  /** name of property on child class that refers to parent, e.g. customer */
  parentProp: string;
  /** foreign key name */
  parentId: string;
  /** name of child table, e.g. orders */
  childTable: string;
  /** name of child class, e.g. Order */
  childModel: string;
  /** name of property on parent class that refers to children, e.g. orders */
  childProp: string;
  /** foreign key on child entity (many-to-many only) */
  childId?: string;
  /** join entity for many-to-many */
  joinModel?: string;
  /** One-to-One vs One-to-Many */
  isOne: boolean;
  /** Many-to-Many */
  isM2M: boolean;
}

export class TableData {
  /** Fields for each table; indexed by schemaName.tableName */
  tables: { [tableName: string]: { [fieldName: string]: ColumnDescription; }; };
  /** Foreign keys for each table; indexed by schemaName.tableName */
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec; }; };
  /** Flag `true` for each table that has any trigger.  This affects how Sequelize performs updates. */
  hasTriggerTables: { [tableName: string]: boolean; };
  /** Indexes for each table; indexed by schemaName.tableName */
  indexes: { [tableName: string]: IndexSpec[]; };
  /** Relations between models, computed from foreign keys */
  relations: Relation[];
  /** Text to be written to the model files, indexed by schemaName.tableName */
  text?: { [name: string]: string; };
  constructor() {
    this.tables = {};
    this.foreignKeys = {};
    this.indexes = {};
    this.hasTriggerTables = {};
    this.relations = [];
  }
}

/** Split schema.table into [schema, table] */
export function qNameSplit(qname: string) {
  if (qname.indexOf(".") > 0) {
    const [schemaName, tableNameOrig] = qname.split(".");
    return [schemaName, tableNameOrig];
  }
  return [null, qname];
}

/** Get combined schema.table name */
export function qNameJoin(schema: string | undefined, table: string | undefined) {
  return !!schema ? schema + "." + table : table as string;
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
  dialectOptions?: { options?: any; };
  /** Where to write the model files */
  directory: string;
  /** Database host */
  host?: string;
  /** Number of spaces or tabs to indent (default 2) */
  indentation?: number;
  /** Model language */
  lang?: LangOption;
  /** Whether to skip writing the files */
  noWrite?: boolean;
  /** Database port */
  port?: number;
  /** Database schema to export */
  schema?: string;
  /** Whether to singularize model names */
  singularize: boolean;
  /** Tables to skip exporting */
  skipTables?: string[];
  /** Whether to indent with spaces instead of tabs (default true) */
  spaces?: boolean;
  /** File where database is stored (sqlite only) */
  storage?: string;
  /** Tables to export (default all) */
  tables?: string[];
  /** Whether to export views (default false) */
  views?: boolean;
}

export type TSField = { special: string[]; elementType: string; } & ColumnDescription;

/** Change casing of val string according to opt [c|l|o|p|u]  */
export function recase(opt: CaseOption | undefined, val: string | null, singularize = false) {
  if (singularize && val) {
    val = Utils.singularize(val);
  }
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

