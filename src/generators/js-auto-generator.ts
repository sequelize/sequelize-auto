import { Table, TableData, recase, qNameSplit, CaseOption, AutoOptions } from "../types";
import _ from "lodash";
import { DialectOptions } from "../dialects/dialect-options";
import AutoGenerator from "./auto-generator";

export class JsAutoGenerator extends AutoGenerator {

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    super(tableData, dialect, options)
  }

  generateText() {
    const tableNames = _.keys(this.tables);

    let spaces = '';
    for (let x = 0; x < this.options.indentation; ++x) {
      spaces += (this.options.spaces === true ? ' ' : "\t");
    }

    let header = "/* jshint indent: " + this.options.indentation + " */\n\n";

    if (this.options.es6) {
      header += "const Sequelize = require('sequelize');\n"
      header += "module.exports = (sequelize, DataTypes) => {\n";
      header += spaces + "return #TABLE#.init(sequelize, DataTypes);\n";
      header += "}\n\n";
      header += "class #TABLE# extends Sequelize.Model {\n";
      header += spaces + "static init(sequelize, DataTypes) {\n";
      header += spaces + "super.init({\n";
    } else if (this.options.esm) {
      header += "import { Model } from 'sequelize';\n\n"
      header += "export default class #TABLE# extends Model {\n";
      header += spaces + "static init(sequelize, DataTypes) {\n";
      header += spaces + "super.init({\n";
    } else {
      header += "module.exports = function(sequelize, DataTypes) {\n";
      header += spaces + "return sequelize.define('#TABLE#', {\n";
    }

    let text: { [name: string]: string } = {};
    tableNames.forEach(table => {
      text[table] = this.addTable(table, header, spaces);
    });

    return text;
  }

  // Create a string for the model of the table
  private addTable(table: string, header: string, spaces: string) {

      let [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);

      let str: string;
      if(!this.options.typescript){
        str = header.replace('#TABLE#', tableName);
      } else {
        throw new Error("Typescript support currently broken");
      }

      // add all the fields
      let fields = _.keys(this.tables[table]);
      fields.forEach((field, index) => {
        str += this.addField(table, field, spaces);
        str += (index+1 < fields.length) ? ",\n" : "\n";
      });

      // add the table options
      str += spaces + "}, {\n";
      str += spaces + spaces  + "sequelize,\n";
      str += spaces + spaces  + "tableName: '" + tableNameOrig + "',\n";

      if(schemaName) {
        str += spaces + spaces  + "schema: '" + schemaName + "',\n";
      }

      if (this.hasTriggerTables[table]) {
        str += spaces + spaces  + "hasTrigger: true,\n";
      }

      // conditionally add additional options
      const hasadditional = _.isObject(this.options.additional) && _.keys(this.options.additional).length > 0;
      if (hasadditional) {
        _.each(this.options.additional, (value, key) => {
          if (key === 'name') {
            // name: true - preserve table name always
            str += spaces + spaces + "name: {\n";
            str += spaces + spaces + spaces + "singular: '" + table + "',\n";
            str += spaces + spaces + spaces + "plural: '" + table + "'\n";
            str += spaces + spaces + "},\n";
          } else {
            value = _.isBoolean(value)?value:("'"+value+"'")
            str += spaces + spaces + key + ": " + value + ",\n";
          }
        });
      }

      str = str.trim();
      str = str.substring(0, str.length - 1);
      str += "\n" + spaces + "}";

      //resume normal output
      str += ");\n";
      if (this.options.es6 || this.options.esm) {
        str += spaces + "return " + tableName + ";\n";
        str += spaces + "}\n}\n";
      } else {
        str += "};\n";
      }
      return str;
  }

  // Create a string containing field attributes (type, defaultValue, etc.)
  private addField(table: string, field: string, spaces: string): string {

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
    const fieldObj = this.tables[table][field];

    if (_.isObject(foreignKey)) {
      fieldObj.foreignKey = foreignKey;
    }

    const fieldName = recase(this.options.caseProp, field);
    let str: string;

    // quote fieldname if not a valid identifier
    let propertyName = this.getPropertyName(table, field);
    if(propertyName) {
      str = (/^[$A-Z_][0-9A-Z_$]*$/i.test(propertyName) ? propertyName : "'" + propertyName + "'") + ": {\n";;
    } else {
      str = (/^[$A-Z_][0-9A-Z_$]*$/i.test(fieldName) ? fieldName : "'" + fieldName + "'") + ": {\n";
    }

    str += this.tabify(4, "field: '" + field + "',\n");

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

    // column's attributes
    const fieldAttrs = _.keys(fieldObj);
    fieldAttrs.forEach(attr => {

      // We don't need the special attribute from postgresql describe table..
      if (attr === "special") {
        return true;
      }

      if (isSerialKey && !wroteAutoIncrement) {
        str += spaces + spaces + spaces + "autoIncrement: true,\n";
        wroteAutoIncrement = true;
      }

      if (attr === "foreignKey") {
        if (foreignKey.isForeignKey) {
          str += spaces + spaces + spaces + "references: {\n";
          str += spaces + spaces + spaces + spaces + "model: {\n"
          str += spaces + spaces + spaces + spaces + spaces + "tableName: \'" + fieldObj[attr].foreignSources.target_table + "\',\n"
          if(this.options.schema) {
            str += spaces + spaces + spaces + spaces + spaces + "schema: \'" + fieldObj[attr].foreignSources.target_schema + "\'\n"
          }
          str += spaces + spaces + spaces + spaces + "},\n"

          str += spaces + spaces + spaces + spaces + "key: \'" + fieldObj[attr].foreignSources.target_column + "\'\n";
          str += spaces + spaces + spaces + "}";
        } else {
          return true;
        }
      } else if (attr === "references") {
        // covered by foreignKey
        return true;
      } else if (attr === "primaryKey") {
        if (fieldObj[attr] === true && (! _.has(fieldObj, 'foreignKey') || (_.has(fieldObj, 'foreignKey') && !! fieldObj.foreignKey.isPrimaryKey))) {
          str += spaces + spaces + spaces + "primaryKey: true";
        } else {
          return true;
        }
      } else if (attr === "autoIncrement") {
        if (fieldObj[attr] === true && !wroteAutoIncrement) {
          str += spaces + spaces + spaces + "autoIncrement: true,\n";
          wroteAutoIncrement = true;
        }
        return true;
      } else if (attr === "allowNull") {
        str += spaces + spaces + spaces + attr + ": " + fieldObj[attr];
      } else if (attr === "defaultValue") {
        let localName = fieldName;
        if (this.dialect.name === "mssql" && defaultVal && defaultVal.toLowerCase() === '(newid())') {
          defaultVal = null; // disable adding "default value" attribute for UUID fields if generating for MS SQL
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
            val_text = /1|true/i.test(defaultVal) ? true : false;

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

        str += spaces + spaces + spaces + attr + ": " + val_text;

      }
      else if (attr === "type" && fieldObj[attr].indexOf('ENUM') === 0) {
        str += spaces + spaces + spaces + attr + ": DataTypes." + fieldObj[attr];
      } else if (attr === "comment" && !fieldObj[attr]) {
        return true;
      } else {
        let _attr = (fieldObj[attr] || '').toLowerCase();
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
          val = fieldObj[attr];
          val = _.isString(val) ? quoteWrapper + val.replace(/\"/g, '\\"') + quoteWrapper : val;
        }

        str += spaces + spaces + spaces + attr + ": " + val;
      }

      str += ",\n";
    });

    if (unique) {
      let uniq = _.isString(unique) ? quoteWrapper + unique.replace(/\"/g, '\\"') + quoteWrapper : unique;
      str += spaces + spaces + spaces + "unique: " + uniq + ",\n";
    }

    if (field != fieldName) {
      str += spaces + spaces + spaces + "field: '" + field + "',\n";
    }

    // removes the last `,` within the attribute options
    str = str.trim().replace(/,+$/, '') + "\n";
    str = spaces + spaces + str + spaces + spaces + "}";
    return str;
  }
}
