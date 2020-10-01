import { Table, TableData, recase, qNameSplit, CaseOption, AutoOptions, Field } from "./types";
import _ from "lodash";
import { DialectOptions, FKSpec } from "./dialects/dialect-options";
import { ColumnDescription } from "sequelize/types";

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
  }

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
    let sp = this.space[1];

    if (this.options.typescript) {
      header += "import { Model, DataTypes } from 'sequelize';\n\n"
    } else if (this.options.es6) {
      header += "const Sequelize = require('sequelize');\n"
      header += "module.exports = (sequelize, DataTypes) => {\n";
      header += sp + "return #TABLE#.init(sequelize, DataTypes);\n";
      header += "}\n\n";
      header += "class #TABLE# extends Sequelize.Model {\n";
      header += sp + "static init(sequelize, DataTypes) {\n";
      header += sp + "super.init({\n";
    } else if (this.options.esm) {
      header += "import { Model } from 'sequelize';\n\n"
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

    let header = this.makeHeaderTemplate();
    let text: { [name: string]: string } = {};
    tableNames.forEach(table => {
      let str = header;

      if (this.options.typescript) {
        str += this.addInterface(table);
      }

      str += this.addTable(table);

      let [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);
      let re = new RegExp('#TABLE#', 'g');
      str = str.replace(re, tableName);

      text[table] = str;
    });

    return text;
  }

  private addModelFields(table: string) {
    let sp = this.space[1];
    let fields = _.keys(this.tables[table]);
    let str = '';
    fields.forEach(field => {
      const name = this.quoteName(recase(this.options.caseProp, field));
      str += `${sp}${name}?: ${this.getTypeScriptType(table, field)};\n`;
    });
    return str;
  }

  private addInterface(table: string) {
    let str: string = "interface #TABLE#Attributes {\n";
    str += this.addModelFields(table);
    str += "}\n\n";
    return str;
  }

  private getTypeScriptType(table: string, field: string) {
    let fieldObj = this.tables[table][field];
    let _attr = (fieldObj["type"] || '').toLowerCase();
    let _type: string;
    if(_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
      _type = 'number'
    } else if (_attr.match(/^string|varying|nvarchar/) || _attr.match(/^n?varchar/)) {
      _type = 'string'
    } else if (_attr === 'bit(1)' || _attr === 'bit' || _attr === 'boolean') {
      _type = 'boolean'
    } else {
      console.log(`Missing type: ${_attr}`)
      _type = 'any'
    }
    return _type;
  }

  // Create a string for the model of the table
  private addTable(table: string) {

      let [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);
      const space = this.space;

      let prefix: string = '';

      if (this.options.typescript) {
        prefix = "export default class #TABLE# extends Model<#TABLE#Attributes, any> implements #TABLE#Attributes {\n";
        prefix += this.addModelFields(table);
        prefix += "\n" + space[1] + "static initModel(sequelize) {\n";
        prefix += space[2] + tableName + ".init({\n";
      }

      // add all the fields
      let str = '';
      let fields = _.keys(this.tables[table]);
      fields.forEach((field, index) => {
        str += this.addField(table, field);
        str += (index+1 < fields.length) ? ",\n" : "\n";
      });

      // add the table options
      str += space[1] + "}, {\n";
      str += space[2]  + "sequelize,\n";
      str += space[2]  + "tableName: '" + tableNameOrig + "',\n";

      if(schemaName) {
        str += space[2]  + "schema: '" + schemaName + "',\n";
      }

      if (this.hasTriggerTables[table]) {
        str += space[2]  + "hasTrigger: true,\n";
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
            value = _.isBoolean(value)?value:("'"+value+"'")
            str += space[2] + key + ": " + value + ",\n";
          }
        });
      }

      str = space[2] + str.trim();
      str = str.substring(0, str.length - 1);
      str += "\n" + space[2] + "}";

      //resume normal output
      str += ");\n";
      if (this.options.es6 || this.options.esm ||  this.options.typescript) {
        str += space[1] + "return " + tableName + ";\n";
        str += space[1] + "}\n}\n";
      } else {
        str += "};\n";
      }
      return prefix + str;
  }

  // Create a string containing field attributes (type, defaultValue, etc.)
  private addField(table: string, field: string): string {

    // ignore Sequelize standard fields
    const additional = this.options.additional;
    if( additional && additional.timestamps !== undefined && additional.timestamps) {
      if((additional.createdAt && field === 'createdAt' || additional.createdAt === field )
        || (additional.updatedAt && field === 'updatedAt' || additional.updatedAt === field )
        || (additional.deletedAt && field === 'deletedAt' || additional.deletedAt === field )) {
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
      fieldObj.type = "ENUM(" + fieldObj.special.map(function(f: string){
        return quoteWrapper + f + quoteWrapper; }).join(',') + ")";
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

      // We don't need the special attribute from postgresql describe table..
      if (attr === "special") {
        return true;
      }

      if (isSerialKey && !wroteAutoIncrement) {
        str += space[3] + "autoIncrement: true,\n";
        wroteAutoIncrement = true;
      }

      if (attr === "foreignKey") {
        if (foreignKey && foreignKey.isForeignKey) {
          str += space[3] + "references: {\n";
          str += space[4] + "model: {\n"
          str += space[5] + "tableName: \'" + fieldObj[attr].foreignSources.target_table + "\',\n"
          if(this.options.schema) {
            str += space[5] + "schema: \'" + fieldObj[attr].foreignSources.target_schema + "\'\n"
          }
          str += space[4] + "},\n"

          str += space[4] + "key: \'" + fieldObj[attr].foreignSources.target_column + "\'\n";
          str += space[3] + "}";
        } else {
          return true;
        }
      } else if (attr === "references") {
        // covered by foreignKey
        return true;
      } else if (attr === "primaryKey") {
        if (fieldObj[attr] === true && (! _.has(fieldObj, 'foreignKey') || (_.has(fieldObj, 'foreignKey') && !! fieldObj.foreignKey.isPrimaryKey))) {
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
        let localName = fieldName;
        if (this.dialect.name === "mssql" && defaultVal && defaultVal.toLowerCase() === '(newid())') {
          defaultVal = null as any; // disable adding "default value" attribute for UUID fields if generating for MS SQL
        }

        if(defaultVal === null || defaultVal === undefined) {
          return true;
        }
        if (isSerialKey) {
          return true; // value generated in the database
        }

        let val_text = defaultVal;
        if (_.isString(defaultVal)) {
          let field_type = fieldObj.type.toLowerCase();

          if (field_type === 'bit(1)' || field_type === 'bit' || field_type === 'boolean') {
            // convert string to boolean
            val_text = /1|true/i.test(defaultVal) ? "true" : "false";

          } else if (field_type === 'array') {
            // change postgres array default '{}' to []
            val_text = defaultVal.replace('{', '[').replace('}', ']');

          } else if (field_type.match(/^(smallint|mediumint|tinyint|int|bigint|float|money|smallmoney|double|decimal|json)/)) {
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

      }
      else if (attr === "type" && fieldObj[attr].indexOf('ENUM') === 0) {
        str += space[3] + attr + ": DataTypes." + fieldObj[attr];
      } else if (attr === "comment" && !fieldObj[attr]) {
        return true;
      } else {
        let _attr = ((fieldObj as any)[attr] || '').toLowerCase();
        let val;

        if (_attr === "boolean" || _attr === "bit(1)" || _attr === "bit") {
          val = 'DataTypes.BOOLEAN';
        }
        else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
          let length = _attr.match(/\(\d+\)/);
          val = 'DataTypes.INTEGER' + (!  _.isNull(length) ? length : '');

          let unsigned = _attr.match(/unsigned/i);
          if (unsigned) {
            val += '.UNSIGNED';
          }
          let zero = _attr.match(/zerofill/i);
          if (zero) {
            val += '.ZEROFILL';
          }
        }
        else if (_attr.match(/^bigint/)) {
          val = 'DataTypes.BIGINT';
        }
        else if (_attr.match(/^n?varchar/)) {
          let length = _attr.match(/\(\d+\)/);
          val = 'DataTypes.STRING' + (!  _.isNull(length) ? length : '');
        }
        else if (_attr.match(/^string|varying|nvarchar/)) {
          val = 'DataTypes.STRING';
        }
        else if (_attr.match(/^n?char/)) {
          let length = _attr.match(/\(\d+\)/);
          val = 'DataTypes.CHAR' + (!_.isNull(length) ? length : '');
        }
        else if (_attr.match(/^real/)) {
          val = 'DataTypes.REAL';
        }
        else if (_attr.match(/^text|ntext$/)) {
          val = 'DataTypes.TEXT';
        }
        else if (_attr==="date"){
            val = 'DataTypes.DATEONLY';
        }
        else if (_attr.match(/^(date|timestamp)/)) {
          val = 'DataTypes.DATE';
        }
        else if (_attr.match(/^(time)/)) {
          val = 'DataTypes.TIME';
        }
        else if (_attr.match(/^(float|float4)/)) {
          val = 'DataTypes.FLOAT';
        }
        else if (_attr.match(/^decimal/)) {
          val = 'DataTypes.DECIMAL';
        }
        else if (_attr.match(/^money/)) {
          val = 'DataTypes.DECIMAL(19,4)';
        }
        else if (_attr.match(/^smallmoney/)) {
          val = 'DataTypes.DECIMAL(10,4)';
        }
        else if (_attr.match(/^(float8|double|numeric)/)) {
          val = 'DataTypes.DOUBLE';
        }
        else if (_attr.match(/^uuid|uniqueidentifier/)) {
          val = 'DataTypes.UUIDV4';
        }
        else if (_attr.match(/^jsonb/)) {
          val = 'DataTypes.JSONB';
        }
        else if (_attr.match(/^json/)) {
          val = 'DataTypes.JSON';
        }
        else if (_attr.match(/^geometry/)) {
          val = 'DataTypes.GEOMETRY';
        }
        else if (_attr.match(/^geography/)) {
          val = "DataTypes.GEOGRAPHY('POINT', 4326)";
        }
        else if (_attr.match(/^array/)) {
          val = 'DataTypes.ARRAY';
        }
        else if (_attr.match(/^(varbinary|image)/)) {
          val = 'DataTypes.BLOB';
        }
        else if (_attr.match(/^hstore/)) {
          val = 'DataTypes.HSTORE';
        } else {
          val = (fieldObj as any)[attr];
          val = _.isString(val) ? quoteWrapper + val.replace(/\"/g, '\\"') + quoteWrapper : val;
        }

        str += space[3] + attr + ": " + val;
      }

      str += ",\n";
    });

    if (unique) {
      let uniq = _.isString(unique) ? quoteWrapper + unique.replace(/\"/g, '\\"') + quoteWrapper : unique;
      str += space[3] + "unique: " + uniq + ",\n";
    }

    if (field != fieldName) {
      str += space[3] + "field: '" + field + "',\n";
    }

    // removes the last `,` within the attribute options
    str = str.trim().replace(/,+$/, '') + "\n";
    str = space[2] + str + space[2] + "}";
    return str;
  }

  /** Quote the name if it is not a valid identifier */
  private quoteName(name: string) {
    return (/^[$A-Z_][0-9A-Z_$]*$/i.test(name) ? name : "'" + name + "'");
  }

  private isNumber(fieldObj: any) {

  }
}
