import { Table, TableData, recase, qNameSplit, CaseOption, AutoOptions } from "../types";
import _ from "lodash";
import { DialectOptions } from "../dialects/dialect-options";
import AutoGenerator from "./auto-generator";
import { regexp } from "sequelize/types/lib/operators";

export class TypescriptAutoGenerator implements AutoGenerator {
  dialect: DialectOptions;
  tables: { [name: string]: any };
  foreignKeys: { [name: string]: any };
  hasTriggerTables: { [name: string]: boolean };
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
  tabValue: string;

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    this.tables = tableData.tables;
    this.foreignKeys = tableData.foreignKeys;
    this.hasTriggerTables = tableData.hasTriggerTables;
    this.dialect = dialect;
    this.options = options;

    this.tabValue = '';
    for (let x = 0; x < this.options.indentation; ++x) {
      this.tabValue += (this.options.spaces === true ? ' ' : "\t");
    }
  }

  generateText() {
    const tableNames = _.keys(this.tables);

    let spaces = '';
    for (let x = 0; x < this.options.indentation; ++x) {
      spaces += (this.options.spaces === true ? ' ' : "\t");
    }

    let header = "/* jshint indent: " + this.options.indentation + " */\n\n";

    header += "import { Model, DataTypes } from 'sequelize';\n\n"
    // header += spaces + "static initModel(sequelize) {\n";
    // header += spaces + spaces + "this.init({\n";

    let text: { [name: string]: string } = {};
    tableNames.forEach(table => {
      let str = header;

      // header += "export default class #TABLE# extends Model {\n";
      str += this.addAttributesTable(table);

      str += this.addTable(table, header, spaces)

      let [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);
      let re = new RegExp('#TABLE#', 'g');
      str = str.replace(re, tableName);

      text[table] = str;
    });

    return text;
  }

  private addAttributesTable(table: string) {
    let str: string = "interface #TABLE#Attributes {\n";

    let fields = _.keys(this.tables[table]);
    fields.forEach((field, index) => {
      str += this.tabify(1,`${field}?: ${this.getTypeScriptType(table, field)}\n`);
    });

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
  private addTable(table: string, header: string, spaces: string) {

      let [schemaName, tableNameOrig] = qNameSplit(table);
      const tableName = recase(this.options.caseModel, tableNameOrig);

      let str: string;
      str = "export default class #TABLE# extends Model<#TABLE#Attributes, any>\n";
      str += this.tabify(1,"implements #TABLE#Attributes {\n");

      let fields = _.keys(this.tables[table]);

      // add Model fields
      fields.forEach((field, index) => {
        str += this.addModelField(table, field, spaces);
        str += '\n';
        // str += (index+1 < fields.length) ? ",\n" : "\n";
      });

      str += spaces + "static initModel(sequelize) {\n";
      str += spaces + spaces + tableName + ".init({\n";

      // add all the fields
      fields.forEach((field, index) => {
        str += this.addField(table, field, spaces);
        str += ',\n';
        // str += (index+1 < fields.length) ? ",\n" : "\n";
      });

      // add the table options
      str += this.tabify(2,  "}, {\n");
      str += this.tabify(3, "sequelize,\n");
      str += this.tabify(3, "tableName: '" + tableNameOrig + "',\n");

      if(schemaName) {
        str += this.tabify(3, "schema: '" + schemaName + "',\n");
      }

      if (this.hasTriggerTables[table]) {
        str += this.tabify(3, "hasTrigger: true,\n");
      }

      if(!(fields.includes('createdAt') && fields.includes('updatedAt'))) {
        str += this.tabify(3, 'timestamps: false,\n');
      }

      // conditionally add additional options
      const hasadditional = _.isObject(this.options.additional) && _.keys(this.options.additional).length > 0;
      if (hasadditional) {
        _.each(this.options.additional, (value, key) => {
          if (key === 'name') {
            // name: true - preserve table name always
            str += this.tabify(3, "name: {\n");
            str += this.tabify(4, "singular: '" + table + "',\n");
            str += this.tabify(4, "plural: '" + table + "'\n");
            str += this.tabify(3, "},\n");
          } else {
            value = _.isBoolean(value)?value:("'"+value+"'")
            str += this.tabify(3, key + ": " + value + ",\n");
          }
        });
      }

      // str = str.trim();
      // str = str.substring(0, str.length - 1);
      str += this.tabify(2, "}");

      //resume normal output
      str += ");\n";

      str += this.tabify(2, "return " + tableName + ";\n");
      str += this.tabify(1, "}\n}\n");
      return str;
  }

  addModelField(table: string, field: string, spaces: string) {
    let _type : string = this.getTypeScriptType(table, field);

    let str: string = this.tabify(1, 'public ' + field + '?: ' + _type + '\n');
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
    str = (/^[$A-Z_][0-9A-Z_$]*$/i.test(fieldName) ? fieldName : "'" + fieldName + "'") + ": {\n";

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
        str += this.tabify(4, "autoIncrement: true,\n");
        wroteAutoIncrement = true;
      }

      if (attr === "foreignKey") {
        if (foreignKey.isForeignKey) {
          str += this.tabify(4, "references: {\n");
          str += this.tabify(5, "model: \'" + fieldObj[attr].foreignSources.target_table + "\',\n")

          str += this.tabify(5, "key: \'" + fieldObj[attr].foreignSources.target_column + "\',\n");
          str += this.tabify(4, "}");
        } else {
          return true;
        }
      } else if (attr === "references") {
        // covered by foreignKey
        return true;
      } else if (attr === "primaryKey") {
        if (fieldObj[attr] === true && (! _.has(fieldObj, 'foreignKey') || (_.has(fieldObj, 'foreignKey') && !! fieldObj.foreignKey.isPrimaryKey))) {
          str += this.tabify(4, "primaryKey: true");
        } else {
          return true;
        }
      } else if (attr === "autoIncrement") {
        if (fieldObj[attr] === true && !wroteAutoIncrement) {
          str += this.tabify(4, "autoIncrement: true,\n");
          wroteAutoIncrement = true;
        }
        return true;
      } else if (attr === "allowNull") {
        str += this.tabify(4, attr + ": " + fieldObj[attr]);
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

        str += this.tabify(4, + attr + ": " + val_text);
        console.log(`Str: ${str}`);

      }
      else if (attr === "type" && fieldObj[attr].indexOf('ENUM') === 0) {
        str += this.tabify(4, + attr + ": DataTypes." + fieldObj[attr]);
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

        str += this.tabify(4, attr + ": " + val);
      }

      str += ",\n";
    });

    if (unique) {
      let uniq = _.isString(unique) ? quoteWrapper + unique.replace(/\"/g, '\\"') + quoteWrapper : unique;
      str += this.tabify(4, "unique: " + uniq + ",\n");
    }

    if (field != fieldName) {
      str += this.tabify(4, "field: '" + field + "',\n");
    }

    // removes the last `,` within the attribute options
    // str = str.trim().replace(/,+$/, '') + "\n";
    str = this.tabify(3, str) + this.tabify(3, "}");
    return str;
  }

  tabify(count: number, line: string) : string {
    let str: string = "";

    for(let ca = 0; ca < count; ca++) {
      str += this.tabValue;
    }
    return str + line;
  }
}
