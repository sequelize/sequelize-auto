import _ from "lodash";
import { check as isReserved } from "reserved-words";
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


export function shouldPrepend  (schema: string|undefined|null, options: { prependSchema?: boolean; prependSchemaExclude: string[]; }) {
  return schema != null && options.prependSchema && !options.prependSchemaExclude.includes(schema);
}

export function modelBaseName(table: string|[string|null|undefined, string], options: { prependSchema?: boolean; prependSchemaExclude: string[]; } ) {
  const [schemaName, tableName] = Array.isArray(table) ? table : qNameSplit(table) as [string|null, string];
  return shouldPrepend(schemaName, options) ? schemaName+'_'+tableName : tableName;
};

export function fileBaseName(table: string|[string|null|undefined, string], options: { prependSchema?: boolean; prependSchemaExclude: string[]; }) {
  const [schemaName, tableName] = Array.isArray(table) ? table : qNameSplit(table) as [string|null, string];
  return shouldPrepend(schemaName, options) ? schemaName+'_'+tableName : tableName;
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

/**
 * "c" camelCase |
 * "k" kebab-case |
 * "l" lower_case |
 * "o" original (db) |
 * "p" PascalCase |
 * "u" UPPER_CASE
 */
export declare type CaseFileOption = "k" | CaseOption;

export interface AutoOptions {
  additional?: any;
  /** Case of file names */
  caseFile?: CaseFileOption;
  /** Case of model names */
  caseModel?: CaseOption;
  /** Case of property names */
  caseProp?: CaseOption;
  /** Close connection after export (default true) */
  closeConnectionAutomatically?: boolean;
  /** Database name */
  database?: string;
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
  /** Whether to avoid creating alias property in relations */
  noAlias?: boolean;
  /** Whether to skip writing index information */
  noIndexes?: boolean;
  /** Whether to skip writing the init-models file */
  noInitModels?: boolean;
  /** Whether to skip writing the files */
  noWrite?: boolean;
  /** Database password */
  password?: string;
  /** Database port */
  port?: number;
  /** Prepend schema to file/class/types */
  prependSchema?: boolean;
  /** Schemas to not prepend */
  prependSchemaExclude: string[];
  /** Database schema to export */
  schema?: string;
  /** Whether to singularize model names */
  singularize: boolean;
  /** Tables to skip exporting */
  skipTables?: string[];
  /** Fields to skip exporting */
  skipFields?: string[];
  /** Whether to indent with spaces instead of tabs (default true) */
  spaces?: boolean;
  /** File where database is stored (sqlite only) */
  storage?: string;
  /** Tables to export (default all) */
  tables?: string[];
  /** Database username */
  username?: string;
  /** Whether to export views (default false) */
  views?: boolean;
  /** Primary Key Suffixes to trim (default "id") */
  pkSuffixes?: string[];
  /** Use `sequelize.define` instead of `init` for model initialization.  See issues #527, #559, #573 */
  useDefine: boolean;
}

export type TSField = { special: string[]; elementType: string; } & ColumnDescription;

/** Uses Inflector via Sequelize, but appends 's' if plural would be the same as singular.
 * Use `Utils.useInflection({ singularize: fn, pluralize: fn2 })` to configure. */
export function pluralize(s: string) {
  let p = Utils.pluralize(s);
  if (p === Utils.singularize(s)) {
    p += 's';
  }
  return p;
}

/** Uses Inflector via Sequelize.  Use `Utils.useInflection({ singularize: fn, pluralize: fn2 })` to configure. */
export function singularize(s: string) {
  return Utils.singularize(s);
}

/** Change casing of val string according to opt [c|l|o|p|u]  */
export function recase(opt: CaseOption | CaseFileOption | undefined, val: string | null, singular = false) {
  if (singular && val) {
    val = singularize(val);
  }
  if (!opt || opt === 'o' || !val) {
    return val || ''; // original
  }
  if (opt === 'c') {
    return _.camelCase(val);
  }
  if (opt === 'k') {
    return _.kebabCase(val);
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

const tsNames = ["DataTypes", "Model", "Optional", "Sequelize"];
export function makeTableName(opt: CaseOption | undefined, tableNameOrig: string | null, singular = false, lang = "es5") {
  let name = recase(opt, tableNameOrig, singular);
  if (isReserved(name) || (lang == "ts" && tsNames.includes(name))) {
    name += "_";
  }
  return name;
}

/** build the array of indentation strings */
export function makeIndent(spaces: boolean | undefined, indent: number | undefined): string[] {
  let sp = '';
  for (let x = 0; x < (indent || 2); ++x) {
    sp += (spaces === true ? ' ' : "\t");
  }
  let space = [];
  for (let i = 0; i < 6; i++) {
    space[i] = sp.repeat(i);
  }
  return space;
}
