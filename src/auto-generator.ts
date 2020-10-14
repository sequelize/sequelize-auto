import _ from "lodash";
import { ColumnDescription } from "sequelize/types";
import { DialectOptions, FKSpec } from "./dialects/dialect-options";
import { AutoOptions, CaseOption, Field, qNameSplit, recase, TableData } from "./types";

export class AutoGenerator {
  dialect: DialectOptions;
  tables: { [tableName: string]: { [fieldName: string]: ColumnDescription } };
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } };
  hasTriggerTables: { [tableName: string]: boolean };
  space: string[];
  options: {
    indentation: number;
    spaces: boolean;
    typescript: boolean;
    es6: boolean;
    esm: boolean;
    caseModel: CaseOption;
    caseProp: CaseOption;
    additional: any;
    schema: string;
  };

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    this.tables = tableData.tables;
    this.foreignKeys = tableData.foreignKeys;
    this.hasTriggerTables = tableData.hasTriggerTables;
    this.dialect = dialect;
    this.options = options;

    // build the space array of indentation strings
    let sp = '';
    for (let x = 0; x < this.options.indentation; ++x) {
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

    if (this.options.typescript) {
      header += "import { DataTypes, Model, Sequelize } from 'sequelize';\n\n";
    } else if (this.options.es6) {
      header += "const Sequelize = require('sequelize');\n";
      header += "module.exports = (sequelize, DataTypes) => {\n";
      header += sp + "return #TABLE#.init(sequelize, DataTypes);\n";
      header += "}\n\n";
      header += "class #TABLE# extends Sequelize.Model {\n";
      header += sp + "static init(sequelize, DataTypes) {\n";
      header += sp + "super.init({\n";
    } else if (this.options.esm) {
      header += "import { Model } from 'sequelize';\n\n";
      header += "export default class #TABLE# extends Model {\n";
      header += sp + "static init(sequelize, DataTypes) {\n";
      header += sp + "super.init({\n";
    } else {
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

      if (this.options.typescript) {
        str += "export interface #TABLE#Attributes {\n";
        str += this.addTypeScriptFields(table) + "}\n\n";

        // str += "export interface #TABLE#CreationAttributes extends Optional<#TABLE#Attributes, 'Id'> {}\n\n";

        str += "export class #TABLE# extends Model<#TABLE#Attributes, #TABLE#Attributes> implements #TABLE#Attributes {\n";
        str += this.addTypeScriptFields(table);
        str += "\n" + this.space[1] + "static initModel(sequelize: Sequelize) {\n";
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

    // add all the fields
    let str = '';
    const fields = _.keys(this.tables[table]);
    fields.forEach((field, index) => {
      str += this.addField(table, field);
      str += (index + 1 < fields.length) ? ",\n" : "\n";
    });

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
        } else {
          value = _.isBoolean(value) ? value : ("'" + value + "'");
          str += space[2] + key + ": " + value + ",\n";
        }
      });
    }

    str = space[2] + str.trim();
    str = str.substring(0, str.length - 1);
    str += "\n" + space[2] + "}";

    str += ");\n";
    if (this.options.es6 || this.options.esm || this.options.typescript) {
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
    if (additional && additional.timestamps !== undefined && additional.timestamps) {
      if ((additional.createdAt && field === 'createdAt' || additional.createdAt === field)
        || (additional.updatedAt && field === 'updatedAt' || additional.updatedAt === field)
        || (additional.deletedAt && field === 'deletedAt' || additional.deletedAt === field)) {
        return '';
      }
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

    const isSerialKey = _.isFunction(this.dialect.isSerialKey) &&
      (this.dialect.isSerialKey(fieldObj) ||
        (fieldObj.foreignKey && this.dialect.isSerialKey(fieldObj.foreignKey)));
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

          } else if (_.endsWith(defaultVal, '()') || _.endsWith(defaultVal, '())')) {
            // wrap default value function
            val_text = "sequelize.fn('" + defaultVal.replace(/[)(]/g, "") + "')";

          } else if (field_type.indexOf('date') === 0 || field_type.indexOf('timestamp') === 0) {
            if (_.includes(['current_timestamp', 'current_date', 'current_time', 'localtime', 'localtimestamp'], defaultVal.toLowerCase())) {
              val_text = "sequelize.literal('" + defaultVal + "')";
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
          val = _.isString(val) ? quoteWrapper + val.replace(/\"/g, '\\"') + quoteWrapper : val;
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
    str = space[2] + str + space[2] + "}";
    return str;
  }

  /** Get the sequelize type from the Field */
  private getSqType(fieldObj: Field, attr: string): string {
    const attrValue = (fieldObj as any)[attr];
    if (!attrValue.toLowerCase) {
      console.log("attrValue", attr, attrValue);
      return attrValue;
    }
    const type = attrValue.toLowerCase();
    const length = type.match(/\(\d+\)/);
    let val = null;

    if (type === "boolean" || type === "bit(1)" || type === "bit") {
      val = 'DataTypes.BOOLEAN';
    } else if (type.match(/^(smallint|mediumint|tinyint|int)/)) {
      val = 'DataTypes.INTEGER' + (!_.isNull(length) ? length : '');
      if (/unsigned/i.test(type)) {
        val += '.UNSIGNED';
      }
      if (/zerofill/i.test(type)) {
        val += '.ZEROFILL';
      }
    } else if (type.match(/^bigint/)) {
      val = 'DataTypes.BIGINT';
    } else if (type.match(/^n?varchar/)) {
      val = 'DataTypes.STRING' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^string|varying|nvarchar/)) {
      val = 'DataTypes.STRING';
    } else if (type.match(/^n?char/)) {
      val = 'DataTypes.CHAR' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^real/)) {
      val = 'DataTypes.REAL';
    } else if (type.match(/^text|ntext$/)) {
      val = 'DataTypes.TEXT';
    } else if (type === "date") {
      val = 'DataTypes.DATEONLY';
    } else if (type.match(/^(date|timestamp)/)) {
      val = 'DataTypes.DATE' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^(time)/)) {
      val = 'DataTypes.TIME' + (!_.isNull(length) ? length : '');
    } else if (type.match(/^(float|float4)/)) {
      val = 'DataTypes.FLOAT';
    } else if (type.match(/^decimal/)) {
      val = 'DataTypes.DECIMAL';
    } else if (type.match(/^money/)) {
      val = 'DataTypes.DECIMAL(19,4)';
    } else if (type.match(/^smallmoney/)) {
      val = 'DataTypes.DECIMAL(10,4)';
    } else if (type.match(/^(float8|double|numeric)/)) {
      val = 'DataTypes.DOUBLE';
    } else if (type.match(/^uuid|uniqueidentifier/)) {
      val = 'DataTypes.UUIDV4';
    } else if (type.match(/^jsonb/)) {
      val = 'DataTypes.JSONB';
    } else if (type.match(/^json/)) {
      val = 'DataTypes.JSON';
    } else if (type.match(/^geometry/)) {
      val = 'DataTypes.GEOMETRY';
    } else if (type.match(/^geography/)) {
      val = "DataTypes.GEOGRAPHY('POINT', 4326)";
    } else if (type.match(/^array/)) {
      val = 'DataTypes.ARRAY';
    } else if (type.match(/^(varbinary|image)/)) {
      val = 'DataTypes.BLOB';
    } else if (type.match(/^hstore/)) {
      val = 'DataTypes.HSTORE';
    }
    return val as string;
  }

  private addTypeScriptFields(table: string) {
    const sp = this.space[1];
    const fields = _.keys(this.tables[table]);
    let str = '';
    fields.forEach(field => {
      const name = this.quoteName(recase(this.options.caseProp, field));
      str += `${sp}${name}?: ${this.getTypeScriptType(table, field)};\n`;
    });
    return str;
  }

  private getTypeScriptType(table: string, field: string) {
    const fieldObj = this.tables[table][field];
    const fieldType = (fieldObj["type"] || '').toLowerCase();
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
      jsType = 'any[]';
    } else {
      console.log(`Missing type: ${fieldType}`);
      jsType = 'any';
    }
    return jsType;
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
    return /^(char|nchar|string|varying|varchar|nvarchar|text|ntext|uuid|uniqueidentifier)/.test(fieldType);
  }

  private isArray(fieldType: string): boolean {
    return /^(array)/.test(fieldType);
  }
}
