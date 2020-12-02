import _, { isDate } from "lodash";
import { ColumnDescription } from "sequelize/types";
import { DialectOptions, FKSpec } from "./dialects/dialect-options";
import { AutoOptions, CaseOption, Field, IndexSpec, LangOption, qNameSplit, recase, TableData } from "./types";

export class AutoGenerator {
  dialect: DialectOptions;
  tables: { [tableName: string]: { [fieldName: string]: ColumnDescription } };
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } };
  hasTriggerTables: { [tableName: string]: boolean };
  indexes: { [tableName: string]: IndexSpec[] };
  space: string[];
  options: {
    indentation?: number;
    spaces?: boolean;
    lang?: LangOption;
    caseModel?: CaseOption;
    caseProp?: CaseOption;
    caseFile?: CaseOption;
    additional?: any;
    schema?: string;
  };

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    this.tables = tableData.tables;
    this.foreignKeys = tableData.foreignKeys;
    this.hasTriggerTables = tableData.hasTriggerTables;
    this.indexes = tableData.indexes;
    this.dialect = dialect;
    this.options = options;
    this.options.lang = this.options.lang || 'es5';

    // build the space array of indentation strings
    let sp = '';
    for (let x = 0; x < (this.options.indentation || 2); ++x) {
      sp += (this.options.spaces === true ? ' ' : "\t");
    }
    this.space = [];
    for (let i = 0; i < 6; i++) {
      this.space[i] = sp.repeat(i);
    }
  }

  makeHeaderTemplate() {
    let header = "/* jshint indent: " + this.options.indentation + " */\n\n";
    const sp = this.space[1];

    if (this.options.lang === 'ts') {
      header += "import Sequelize, { DataTypes, Model, Optional } from 'sequelize';\n\n";
    } else if (this.options.lang === 'es6') {
      header += "const Sequelize = require('sequelize');\n";
      header += "module.exports = (sequelize, DataTypes) => {\n";
      header += sp + "return #TABLE#.init(sequelize, DataTypes);\n";
      header += "}\n\n";
      header += "class #TABLE# extends Sequelize.Model {\n";
      header += sp + "static init(sequelize, DataTypes) {\n";
      header += sp + "super.init({\n";
    } else if (this.options.lang === 'esm') {
      header += "import { Model, Sequelize } from 'sequelize';\n\n";
      header += "export default class #TABLE# extends Model {\n";
      header += sp + "static init(sequelize, DataTypes) {\n";
      header += sp + "super.init({\n";
    } else {
      header += "const Sequelize = require('sequelize');\n";
      header += "module.exports = function(sequelize, DataTypes) {\n";
      header += sp + "return sequelize.define('#TABLE#', {\n";
    }
    return header;
  }

  generateText() {
    const tableNames = _.keys(this.tables);

    const header = this.makeHeaderTemplate();

    const text: { [name: string]: string } = {};
    tableNames.forEach(table => {
      let str = header;
      const [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);

      if (this.options.lang === 'ts') {
        const associations = this.addTypeScriptAssociationMixins(table)
        const needed = _.keys(associations.needed).sort();
        needed.forEach(model => {
          const set = associations.needed[model];
          const filename = recase(this.options.caseFile, model);
          str += 'import type { ';
          str += Array.from(set.values()).sort().join(', ');
          str += ` } from './${filename}';\n\n`;
        });

        str += "export interface #TABLE#Attributes {\n";
        str += this.addTypeScriptFields(table, true) + "}\n\n";

        const primaryKeys = this.getTypeScriptPrimaryKeys(table);

        if (primaryKeys.length) {
          str += `export type #TABLE#Pk = ${primaryKeys.map((k) => `"${recase(this.options.caseProp, k)}"`).join(' | ')};\n`;
          str += `export type #TABLE#Id = #TABLE#[#TABLE#Pk];\n\n`;
          str += "export type #TABLE#CreationAttributes = Optional<#TABLE#Attributes, #TABLE#Pk>\n\n";
        } else {
          str += "export type #TABLE#CreationAttributes = #TABLE#Attributes\n\n";
        }

        str += "export class #TABLE# extends Model<#TABLE#Attributes, #TABLE#CreationAttributes> implements #TABLE#Attributes {\n";
        str += this.addTypeScriptFields(table, false);
        str += associations.str;
        str += "\n" + this.space[1] + "static initModel(sequelize: Sequelize.Sequelize): typeof " + tableName + " {\n";
        str += this.space[2] + tableName + ".init({\n";
      }

      str += this.addTable(table);

      const re = new RegExp('#TABLE#', 'g');
      str = str.replace(re, tableName);

      text[table] = str;
    });

    return text;
  }

  // Create a string for the model of the table
  private addTable(table: string) {

    const [schemaName, tableNameOrig] = qNameSplit(table);
    const tableName = recase(this.options.caseModel, tableNameOrig);
    const space = this.space;
    let timestamps = (this.options.additional && this.options.additional.timestamps === true) || false;
    let paranoid = false;

    // add all the fields
    let str = '';
    const fields = _.keys(this.tables[table]);
    fields.forEach((field, index) => {
      timestamps ||= this.isTimestampField(field);
      paranoid ||= this.isParanoidField(field);

      str += this.addField(table, field);
    });

    // trim off last ",\n"
    str = str.substring(0, str.length - 2) + "\n";

    // add the table options
    str += space[1] + "}, {\n";
    str += space[2] + "sequelize,\n";
    str += space[2] + "tableName: '" + tableNameOrig + "',\n";

    if (schemaName) {
      str += space[2] + "schema: '" + schemaName + "',\n";
    }

    if (this.hasTriggerTables[table]) {
      str += space[2] + "hasTrigger: true,\n";
    }

    str += space[2] + "timestamps: " + timestamps + ",\n";
    if (paranoid) {
      str += space[2] + "paranoid: true,\n";
    }

    // conditionally add additional options
    const hasadditional = _.isObject(this.options.additional) && _.keys(this.options.additional).length > 0;
    if (hasadditional) {
      _.each(this.options.additional, (value, key) => {
        if (key === 'name') {
          // name: true - preserve table name always
          str += space[2] + "name: {\n";
          str += space[3] + "singular: '" + table + "',\n";
          str += space[3] + "plural: '" + table + "'\n";
          str += space[2] + "},\n";
        } else if (key === "timestamps" || key === "paranoid") {
          // handled above
        } else {
          value = _.isBoolean(value) ? value : ("'" + value + "'");
          str += space[2] + key + ": " + value + ",\n";
        }
      });
    }

    // add indexes
    str += this.addIndexes(table);

    str = space[2] + str.trim();
    str = str.substring(0, str.length - 1);
    str += "\n" + space[1] + "}";

    str += ");\n";
    const lang = this.options.lang;
    if (lang === 'es6' || lang === 'esm' || lang === 'ts') {
      str += space[1] + "return " + tableName + ";\n";
      str += space[1] + "}\n}\n";
    } else {
      str += "};\n";
    }
    return str;
  }

  // Create a string containing field attributes (type, defaultValue, etc.)
  private addField(table: string, field: string): string {

    // ignore Sequelize standard fields
    const additional = this.options.additional;
    if (additional && (additional.timestamps !== false) && (this.isTimestampField(field) || this.isParanoidField(field))) {
      return '';
    }

    // Find foreign key
    const foreignKey = this.foreignKeys[table] && this.foreignKeys[table][field] ? this.foreignKeys[table][field] : null;
    const fieldObj = this.tables[table][field] as Field;

    if (_.isObject(foreignKey)) {
      fieldObj.foreignKey = foreignKey;
    }

    const fieldName = recase(this.options.caseProp, field);
    let str = this.quoteName(fieldName) + ": {\n";

    let defaultVal = fieldObj.defaultValue;
    const quoteWrapper = '"';

    // ENUMs for postgres...
    if (fieldObj.type === "USER-DEFINED" && !!fieldObj.special) {
      fieldObj.type = "ENUM(" + fieldObj.special.map(function (f: string) {
        return quoteWrapper + f + quoteWrapper;
      }).join(',') + ")";
    }

    const unique = fieldObj.unique || fieldObj.foreignKey && fieldObj.foreignKey.isUnique;

    const isSerialKey = (fieldObj.foreignKey && fieldObj.foreignKey.isSerialKey) ||
      this.dialect.isSerialKey && this.dialect.isSerialKey(fieldObj);

    let wroteAutoIncrement = false;
    const space = this.space;

    // column's attributes
    const fieldAttrs = _.keys(fieldObj);
    fieldAttrs.forEach(attr => {

      // We don't need the special attribute from postgresql; "unique" is handled separately
      if (attr === "special" || attr === "unique") {
        return true;
      }

      if (isSerialKey && !wroteAutoIncrement) {
        str += space[3] + "autoIncrement: true,\n";
        wroteAutoIncrement = true;
      }

      if (attr === "foreignKey") {
        if (foreignKey && foreignKey.isForeignKey) {
          str += space[3] + "references: {\n";
          if (this.options.schema) {
            str += space[4] + "model: {\n";
            str += space[5] + "tableName: \'" + fieldObj[attr].foreignSources.target_table + "\',\n";
            str += space[5] + "schema: \'" + fieldObj[attr].foreignSources.target_schema + "\'\n";
            str += space[4] + "},\n";
          } else {
            str += space[4] + "model: \'" + fieldObj[attr].foreignSources.target_table + "\',\n";
          }
          str += space[4] + "key: \'" + fieldObj[attr].foreignSources.target_column + "\'\n";
          str += space[3] + "}";
        } else {
          return true;
        }
      } else if (attr === "references") {
        // covered by foreignKey
        return true;
      } else if (attr === "primaryKey") {
        if (fieldObj[attr] === true && (!_.has(fieldObj, 'foreignKey') || !!fieldObj.foreignKey.isPrimaryKey)) {
          str += space[3] + "primaryKey: true";
        } else {
          return true;
        }
      } else if (attr === "autoIncrement") {
        if (fieldObj[attr] === true && !wroteAutoIncrement) {
          str += space[3] + "autoIncrement: true,\n";
          wroteAutoIncrement = true;
        }
        return true;
      } else if (attr === "allowNull") {
        str += space[3] + attr + ": " + fieldObj[attr];
      } else if (attr === "defaultValue") {
        const localName = fieldName;
        if (this.dialect.name === "mssql" && defaultVal && defaultVal.toLowerCase() === '(newid())') {
          defaultVal = null as any; // disable adding "default value" attribute for UUID fields if generating for MS SQL
        }

        if (defaultVal === null || defaultVal === undefined) {
          return true;
        }
        if (isSerialKey) {
          return true; // value generated in the database
        }

        let val_text = defaultVal;
        if (_.isString(defaultVal)) {
          const field_type = fieldObj.type.toLowerCase();

          if (field_type === 'bit(1)' || field_type === 'bit' || field_type === 'boolean') {
            // convert string to boolean
            val_text = /1|true/i.test(defaultVal) ? "true" : "false";

          } else if (field_type === 'array') {
            // change postgres array default '{}' to []
            val_text = defaultVal.replace('{', '[').replace('}', ']');

          } else if (this.isNumber(field_type) || field_type.match(/^(json)/)) {
            // remove () around mssql numeric values; don't quote numbers or json
            val_text = defaultVal.replace(/[)(]/g, '');

          } else if (field_type === 'uuid' && (defaultVal === 'gen_random_uuid()' || defaultVal === 'uuid_generate_v4()')) {
            val_text = "DataTypes.UUIDV4";

          } else if (_.endsWith(defaultVal, '()') || _.endsWith(defaultVal, '())')) {
            // wrap default value function
            val_text = "Sequelize.fn('" + defaultVal.replace(/[)(]/g, "") + "')";

          } else if (field_type.indexOf('date') === 0 || field_type.indexOf('timestamp') === 0) {
            if (_.includes(['current_timestamp', 'current_date', 'current_time', 'localtime', 'localtimestamp'], defaultVal.toLowerCase())) {
              val_text = "Sequelize.literal('" + defaultVal + "')";
            } else {
              val_text = quoteWrapper + defaultVal + quoteWrapper;
            }
          } else {
            val_text = quoteWrapper + defaultVal + quoteWrapper;
          }
        }

        // val_text = _.isString(val_text) && !val_text.match(/^sequelize\.[^(]+\(.*\)$/)
        // ? self.sequelize.escape(_.trim(val_text, '"'), null, self.options.dialect)
        // : val_text;
        // don't prepend N for MSSQL when building models...
        // defaultVal = _.trimStart(defaultVal, 'N');

        str += space[3] + attr + ": " + val_text;

      } else if (attr === "type" && fieldObj[attr].indexOf('ENUM') === 0) {
        str += space[3] + attr + ": DataTypes." + fieldObj[attr];
      } else if (attr === "comment" && !fieldObj[attr]) {
        return true;
      } else {
        let val = this.getSqType(fieldObj, attr);
        if (val == null) {
          val = (fieldObj as any)[attr];
          val = _.isString(val) ? quoteWrapper + this.escapeSpecial(val) + quoteWrapper : val;
        }
        str += space[3] + attr + ": " + val;
      }

      str += ",\n";
    });

    if (unique) {
      const uniq = _.isString(unique) ? quoteWrapper + unique.replace(/\"/g, '\\"') + quoteWrapper : unique;
      str += space[3] + "unique: " + uniq + ",\n";
    }

    if (field !== fieldName) {
      str += space[3] + "field: '" + field + "',\n";
    }

    // removes the last `,` within the attribute options
    str = str.trim().replace(/,+$/, '') + "\n";
    str = space[2] + str + space[2] + "},\n";
    return str;
  }

  private addIndexes(table: string) {
    const indexes = this.indexes[table];
    const space = this.space;
    let str = "";
    if (indexes && indexes.length) {
      str += space[2] + "indexes: [\n";
      indexes.forEach(idx => {
        str += space[3] + "{\n";
        if (idx.name) {
          str += space[4] + `name: "${idx.name}",\n`;
        }
        if (idx.unique) {
          str += space[4] + "unique: true,\n";
        }
        if (idx.type) {
          if (['UNIQUE', 'FULLTEXT', 'SPATIAL'].includes(idx.type)) {
            str += space[4] + `type: "${idx.type}",\n`;
          } else {
            str += space[4] + `using: "${idx.type}",\n`;
          }
        }
        str += space[4] + `fields: [\n`;
        idx.fields.forEach(ff => {
          str += space[5] + `{ name: "${ff.attribute}"`;
          if (ff.collate) {
            str += `, collate: "${ff.collate}"`;
          }
          if (ff.length) {
            str += `, length: ${ff.length}`;
          }
          if (ff.order && ff.order !== "ASC") {
            str += `, order: "${ff.order}"`;
          }
          str += " },\n";
        });
        str += space[4] + "]\n";
        str += space[3] + "},\n";
      });
      str += space[2] + "],\n";
    }
    return str;
  }

  /** Get the sequelize type from the Field */
  private getSqType(fieldObj: Field, attr: string): string {
    const attrValue = (fieldObj as any)[attr];
    if (!attrValue.toLowerCase) {
      console.log("attrValue", attr, attrValue);
      return attrValue;
    }
    const type: string = attrValue.toLowerCase();
    const length = type.match(/\(\d+\)/);
    const precision = type.match(/\(\d+,\d+\)/);
    let val = null;
    let typematch = null;

    if (type === "boolean" || type === "bit(1)" || type === "bit") {
      val = 'DataTypes.BOOLEAN';
    } else if (typematch = type.match(/^(bigint|smallint|mediumint|tinyint|int)/)) {
      // integer subtypes
      val = 'DataTypes.' + (typematch[0] === 'int' ? 'INTEGER' : typematch[0].toUpperCase());
      if (/unsigned/i.test(type)) {
        val += '.UNSIGNED';
      }
      if (/zerofill/i.test(type)) {
        val += '.ZEROFILL';
      }
    } else if (type.match(/n?varchar|string|varying/)) {
      val = 'DataTypes.STRING' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^n?char/)) {
      val = 'DataTypes.CHAR' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^real/)) {
      val = 'DataTypes.REAL';
    } else if (type.match(/text$/)) {
      val = 'DataTypes.TEXT' + (!_.isNull(length) ? length : '');
    } else if (type === "date") {
      val = 'DataTypes.DATEONLY';
    } else if (type.match(/^(date|timestamp)/)) {
      val = 'DataTypes.DATE' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^(time)/)) {
      val = 'DataTypes.TIME';
    } else if (type.match(/^(float|float4)/)) {
      val = 'DataTypes.FLOAT' + (!_.isNull(precision) ? precision : '');
    } else if (type.match(/^decimal/)) {
      val = 'DataTypes.DECIMAL' + (!_.isNull(precision) ? precision : '');
    } else if (type.match(/^money/)) {
      val = 'DataTypes.DECIMAL(19,4)';
    } else if (type.match(/^smallmoney/)) {
      val = 'DataTypes.DECIMAL(10,4)';
    } else if (type.match(/^(float8|double|numeric)/)) {
      val = 'DataTypes.DOUBLE' + (!_.isNull(precision) ? precision : '');
    } else if (type.match(/^uuid|uniqueidentifier/)) {
      val = 'DataTypes.UUID';
    } else if (type.match(/^jsonb/)) {
      val = 'DataTypes.JSONB';
    } else if (type.match(/^json/)) {
      val = 'DataTypes.JSON';
    } else if (type.match(/^geometry/)) {
      const gtype = fieldObj.special ? `(${fieldObj.special})` : '';
      val = `DataTypes.GEOMETRY${gtype}`;
    } else if (type.match(/^geography/)) {
      const gtype = fieldObj.special ? `(${fieldObj.special})` : '';
      val = `DataTypes.GEOGRAPHY${gtype}`;
    } else if (type.match(/^array/)) {
      const eltype = this.getSqType(fieldObj, "special");
      val = `DataTypes.ARRAY(${eltype})`;
    } else if (type.match(/(binary|image|blob)/)) {
      val = 'DataTypes.BLOB';
    } else if (type.match(/^hstore/)) {
      val = 'DataTypes.HSTORE';
    }
    return val as string;
  }

  private getTypeScriptPrimaryKeys(table: string): Array<string> {
    const fields = _.keys(this.tables[table]);
    return fields.filter((field): boolean => {
      const fieldObj = this.tables[table][field];
      return fieldObj['primaryKey'];
    });
  }

  private addTypeScriptAssociationMixins(table: string): Record<string, any> {
    const sp = this.space[1];
    const [mySchemaName, myTableName] = qNameSplit(table);
    let str = '';
    const needed: Record<string, Set<String>> = {};
    const fkTables = _.keys(this.foreignKeys).sort();
    fkTables.forEach(t => {
      const [_theirSchemaName, theirTableName] = qNameSplit(t);
      const modelName = recase(this.options.caseModel, myTableName);
      const fkFields = this.foreignKeys[t];
      const fkFieldNames = _.keys(fkFields);
      fkFieldNames.forEach(fkFieldName => {
        const spec = fkFields[fkFieldName];
        if (spec.isForeignKey) {
          const targetModel = recase(this.options.caseModel, spec.foreignSources.target_table as string);

          if (spec.source_schema === mySchemaName && spec.source_table === myTableName) {
            const btModel = recase(this.options.caseModel, spec.foreignSources.target_table as string);
            const btModelSingular = btModel.replace(/s$/, '');
            needed[btModel] ??= new Set();
            str += `${sp}// ${modelName} belongsTo ${btModel}\n`;
            str += `${sp}get${btModelSingular}: Sequelize.BelongsToGetAssociationMixin<${btModel}>;\n`;
            str += `${sp}set${btModelSingular}: Sequelize.BelongsToSetAssociationMixin<${btModel}, ${btModel}Id>;\n`;
            str += `${sp}create${btModelSingular}: Sequelize.BelongsToCreateAssociationMixin<${btModel}>;\n`;
            needed[btModel].add(btModel)
            needed[btModel].add(btModel+'Id');
          } else if (spec.target_schema === mySchemaName && spec.target_table === myTableName) {
            const hasModel = recase(this.options.caseModel, spec.foreignSources.source_table as string);
            const isOne = ((spec.isPrimaryKey && !_.some(fkFields, f => f.isPrimaryKey && f.source_column !== fkFieldName) ||
              (spec.isUnique && !_.some(fkFields, f => f.isUnique === spec.isUnique && f.source_column !== fkFieldName))));
            needed[hasModel] ??= new Set();
            if (isOne) {
              const hasModelSingular = hasModel.replace(/s$/, '');
              str += `${sp}// ${modelName} hasOne ${hasModel}\n`;
              str += `${sp}get${hasModelSingular}: Sequelize.HasOneGetAssociationMixin<${hasModel}>;\n`;
              str += `${sp}set${hasModelSingular}: Sequelize.HasOneSetAssociationMixin<${hasModel}, ${hasModel}Id>;\n`;
              str += `${sp}create${hasModelSingular}: Sequelize.HasOneCreateAssociationMixin<${hasModel}CreationAttributes>;\n`;
              needed[hasModel].add(hasModel);
              needed[hasModel].add(`${hasModel}Id`);
              needed[hasModel].add(`${hasModel}CreationAttributes`);
            } else {
              str += `${sp}// ${modelName} hasMany ${hasModel}\n`;
              str += `${sp}get${hasModel}: Sequelize.HasManyGetAssociationsMixin<${hasModel}>;\n`;
              str += `${sp}set${hasModel}: Sequelize.HasManySetAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`;
              str += `${sp}add${hasModel}: Sequelize.HasManyAddAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`;
              str += `${sp}remove${hasModel}: Sequelize.HasManyRemoveAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`;
              str += `${sp}has${hasModel}: Sequelize.HasManyHasAssociationsMixin<${hasModel}, ${hasModel}Id>;\n`;
              str += `${sp}count${hasModel}: Sequelize.HasManyCountAssociationsMixin;\n`;
              needed[hasModel].add(hasModel);
              needed[hasModel].add(`${hasModel}Id`);
            }
            if (spec.isPrimaryKey) {
              // if FK is also part of the PK, see if there is a "many-to-many" junction
              const otherKey = _.find(fkFields, k => k.isForeignKey && k.isPrimaryKey && k.source_column !== fkFieldName);
              if (otherKey) {
                const otherModel = recase(this.options.caseModel, otherKey.foreignSources.target_table as string);
                needed[otherModel] ??= new Set();
                str += `${sp}// ${modelName} belongsToMany ${otherModel}\n`;
                str += `${sp}get${otherModel}: Sequelize.BelongsToManyGetAssociationsMixin<${otherModel}>;\n`;
                str += `${sp}set${otherModel}: Sequelize.BelongsToManySetAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`;
                str += `${sp}add${otherModel}: Sequelize.BelongsToManyAddAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`;
                str += `${sp}remove${otherModel}: Sequelize.BelongsToManyRemoveAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`;
                str += `${sp}has${otherModel}: Sequelize.BelongsToManyHasAssociationsMixin<${otherModel}, ${otherModel}Id>;\n`;
                str += `${sp}count${otherModel}: Sequelize.BelongsToManyCountAssociationsMixin;\n`;
                needed[otherModel].add(otherModel);
                needed[otherModel].add(`${otherModel}Id`);
              }
            }
          }
        }
      });
    });
    return {needed, str};
  }


  private addTypeScriptFields(table: string, isInterface: boolean) {
    const sp = this.space[1];
    const fields = _.keys(this.tables[table]);
    const notNull = isInterface ? '' : '!';
    let str = '';
    fields.forEach(field => {
      const name = this.quoteName(recase(this.options.caseProp, field));
      const allowNull = this.getTypeScriptAllowNull(table, field);
      str += `${sp}${name}${allowNull ? '?' : notNull}: ${this.getTypeScriptType(table, field)};\n`;
    });
    return str;
  }

  private getTypeScriptAllowNull(table: string, field: string) {
    const fieldObj = this.tables[table][field];
    return fieldObj['allowNull'];
  }

  private getTypeScriptType(table: string, field: string) {
    const fieldObj = this.tables[table][field];
    return this.getTypeScriptFieldType(fieldObj, "type");
  }

  private getTypeScriptFieldType(fieldObj: any, attr: string) {
    const fieldType = (fieldObj[attr] || '').toLowerCase();
    let jsType: string;
    if (this.isString(fieldType)) {
      jsType = 'string';
    } else if (this.isNumber(fieldType)) {
      jsType = 'number';
    } else if (this.isBoolean(fieldType)) {
      jsType = 'boolean';
    } else if (this.isDate(fieldType)) {
      jsType = 'Date';
    } else if (this.isArray(fieldType)) {
      const eltype = this.getTypeScriptFieldType(fieldObj, "special");
      jsType = eltype + '[]';
    } else if (this.isEnum(fieldType)) {
      const values = fieldType.substring(5, fieldType.length - 1).split(',').join(' | ');
      jsType = values;
    } else {
      console.log(`Missing TypeScript type: ${fieldType}`);
      jsType = 'any';
    }
    return jsType;
  }

  private isTimestampField(field: string) {
    const additional = this.options.additional;
    if (additional.timestamps === false) {
      return false;
    }
    return ((!additional.createdAt && field.toLowerCase() === 'createdat') || additional.createdAt === field)
      || ((!additional.updatedAt && field.toLowerCase() === 'updatedat') || additional.updatedAt === field);
  }

  private isParanoidField(field: string) {
    const additional = this.options.additional;
    if (additional.timestamps === false || additional.paranoid === false) {
      return false;
    }
    return ((!additional.deletedAt && field.toLowerCase() === 'deletedat') || additional.deletedAt === field);
  }

  private escapeSpecial (val: string) {
    if (typeof(val) !== "string") {
      return val;
    }
    return val
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t');
  }

  /** Quote the name if it is not a valid identifier */
  private quoteName(name: string) {
    return (/^[$A-Z_][0-9A-Z_$]*$/i.test(name) ? name : "'" + name + "'");
  }

  private isNumber(fieldType: string): boolean {
    return /^(smallint|mediumint|tinyint|int|bigint|float|money|smallmoney|double|decimal|numeric|real)/.test(fieldType);
  }

  private isBoolean(fieldType: string): boolean {
    return /^(boolean|bit)/.test(fieldType);
  }

  private isDate(fieldType: string): boolean {
    return /^(date|time|timestamp)/.test(fieldType);
  }

  private isString(fieldType: string): boolean {
    return /^(char|nchar|string|varying|varchar|nvarchar|text|longtext|mediumtext|tinytext|ntext|uuid|uniqueidentifier)/.test(fieldType);
  }

  private isArray(fieldType: string): boolean {
    return /^(array)/.test(fieldType);
  }

  private isEnum(fieldType: string): boolean {
    return /^(enum)/.test(fieldType);
  }
}
