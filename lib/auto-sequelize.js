/**
 * User: puti.
 * Time: 2020-05-17 17:14.
 */
// 不能删除,提供eval 需要的环境
const {Sequelize, DataTypes} = require("sequelize");
const dialects = require("./dialects");
const SqlString = require("./sql-string");
const {mapType, autoBindAssociate, generateIndexExplorer, getKeyName} = require("./utils");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const CLIEngine = require("eslint").CLIEngine;
const _ = require("lodash");


class AutoSequelize {
  constructor(database, username, password, options) {
    if (database instanceof Sequelize) {
      options = username;
    }
    if (options && options.dialect === "sqlite" && !options.storage)
      options.storage = database;
    
    if (database instanceof Sequelize) {
      this.sequelize = database;
    } else {
      this.sequelize = new Sequelize(database, username, password, options || {});
    }
    
    this.isReady = false;
    
    this.queryInterface = this.sequelize.getQueryInterface();
    this.tables = {};
    this.tablesText = {};
    this.foreignKeys = {};
    this.tablesComments = {};
    this.dialect = dialects[this.sequelize.options.dialect];
    
    this.options = Object.assign({
      global: "Sequelize",
      local: "sequelize",
      spaces: false,
      indentation: 1,
      directory: "./models",
      additional: {},
      freezeTableName: true,
      isEgg: false,
      typescript: false,
      eslint: true,
      camelCase: true,
      camelCaseForFileName: true
    }, options || {});
    
    let spaces = "";
    for (let x = 0; x < this.options.indentation; ++x) {
      spaces += (this.options.spaces === true ? " " : "\t");
    }
    this.spacesR = function (count = 1) {
      return spaces.repeat(count)
    }
  }
  
  /**
   * 获取表数据
   * @returns {Promise<AutoSequelize>}
   */
  async prepare() {
    let tables = [];
    if (this.options.dialect === "postgres" && this.options.schema) {
      const showTablesSql = this.dialect.showTablesQuery(this.options.schema);
      const tableNames = await this.sequelize.query(showTablesSql, {
        raw: true,
        type: this.sequelize.QueryTypes.SHOWTABLES
      });
      tables = _.flatten(tableNames)
    } else {
      tables = await this.queryInterface.showAllTables();
    }
    await this._processTables(tables);
    this.isReady = true;
    return this;
  }
  
  
  /**
   * sequelize define model
   * @returns {AutoSequelize}
   */
  initModels() {
    if (!this.isReady) throw new Error('wait prepare')
    Object.keys(this.tables).forEach(table => this._map2Attributes(table));
    autoBindAssociate(this.sequelize.models);
    return this;
  }
  
  /**
   * 生成文件
   * @returns {Promise<never>|Promise<any | never>}
   */
  outputFiles() {
    if (!this.isReady) throw new Error('wait prepare')
    Object.keys(this.tables).forEach(table => this._generateText(table));
    const indexExplorers = generateIndexExplorer(_.keys(this.tablesText), this.options.spaces, this.options.indentation, this.options.camelCase, this.options.camelCaseForFileName);
    if (this.options.directory) {
      return this._write(this.tablesText, [], indexExplorers);
    } else {
      return Promise.reject('no output directory')
    }
  }
  
  _processTables(__tables) {
    if (this.sequelize.options.dialect === "mssql")
      __tables = _.map(__tables, "tableName");
    let tables;
    if (this.options.tables) tables = _.intersection(__tables, this.options.tables);
    else if (this.options.skipTables) tables = _.difference(__tables, this.options.skipTables);
    else tables = __tables;
    return Promise.all([...tables.map(table => this._mapTable(table)), ...tables.map(table => this._mapForeignKeys(table)), this._getTablesComment()]);
  }
  
  async _getTablesComment() {
    if (!this.dialect && !this.dialect.getTablesInfoQuery) return;
    const sql = this.dialect.getTablesInfoQuery(this.sequelize.config.database);
    const res = await this.sequelize.query(sql, {
      type: this.sequelize.QueryTypes.SELECT,
      raw: true
    });
    this.tablesComments = res.reduce((memo, value) => {
      memo[value.tablename] = value.comment;
      return memo;
    }, {});
  }
  
  async _mapTable(table) {
    const value = await this.queryInterface.describeTable(table, this.options.schema);
    this.tables[table] = value
  }
  
  async _mapForeignKeys(table) {
    if (!this.dialect) return;
    
    const sql = this.dialect.getForeignKeysQuery(table, this.sequelize.config.database);
    const res = await this.sequelize.query(sql, {
      type: this.sequelize.QueryTypes.SELECT,
      raw: true
    });
    res.forEach(t => {
      this._assignColumnDetails(t, table)
    });
  }
  
  _assignColumnDetails(ref, table) {
    // map sqlite's PRAGMA results
    ref = _.mapKeys(ref, (value, key) => {
      switch (key) {
        case "from":
          return "source_column";
        case "to":
          return "target_column";
        case "table":
          return "target_table";
        default:
          return key;
      }
    });
    
    ref = _.assign({
      source_table: table,
      source_schema: this.sequelize.options.database,
      target_schema: this.sequelize.options.database
    }, ref);
    
    if (!_.isEmpty(_.trim(ref.source_column)) && !_.isEmpty(_.trim(ref.target_column))) {
      ref.isForeignKey = true;
      ref.foreignSources = _.pick(ref, ["source_table", "source_schema", "target_schema", "target_table", "source_column", "target_column"]);
    }
    
    if (_.isFunction(this.dialect.isUnique) && this.dialect.isUnique(ref))
      ref.isUnique = true;
    
    if (_.isFunction(this.dialect.isPrimaryKey) && this.dialect.isPrimaryKey(ref))
      ref.isPrimaryKey = true;
    
    if (_.isFunction(this.dialect.isSerialKey) && this.dialect.isSerialKey(ref))
      ref.isSerialKey = true;
    
    this.foreignKeys[table] = this.foreignKeys[table] || {};
    this.foreignKeys[table][ref.source_column] = _.assign({}, this.foreignKeys[table][ref.source_column], ref);
  }
  
  _includeTimeField(field) {
    const additional = this.options.additional;
    if (additional && additional.timestamps !== undefined && additional.timestamps) {
      if ((additional.createdAt && field === "createdAt" || additional.createdAt === field)
        || (additional.updatedAt && field === "updatedAt" || additional.updatedAt === field)
        || (additional.deletedAt && field === "deletedAt" || additional.deletedAt === field)) {
        return false;
      }
    }
    return true;
  }
  
  _map2Attributes(table) {
    const tableName = this.options.camelCase ? _.camelCase(table) : table;
    const model = this.sequelize.define(tableName, eval(`Object.assign(${this._generateAttrText(table)});`), {
      timestamps: false,
      ...(eval(`Object.assign(${this._generateOptionText(table)});`))
    });
    if (!this.hasPk(table)) {
      model.removeAttribute('id')
    }
  }
  
  hasPk(table) {
    const fields = _.keys(this.tables[table]);
    return fields.some(key => this.tables[table][key].primaryKey);
  }
  
  /**
   * 生成 ModelAttributes 字符串
   * @param table
   * @returns {string}
   * @private
   */
  _generateAttrText(table) {
    const fields = _.keys(this.tables[table]);
    const quoteWrapper = "\"";
    const hasPK = this.hasPk(table)
    let attrsText = "{\n    " + fields.reduce((memo, field, i) => {
      if (!this._includeTimeField(field)) {
        return memo;
      }
      // Find foreign key
      const foreignKey = this.foreignKeys[table] && this.foreignKeys[table][field] ? this.foreignKeys[table][field] : null;
      
      const fieldOptions = this.tables[table][field];
      if (_.isObject(foreignKey)) {
        fieldOptions.foreignKey = foreignKey;
      }
      
      // column's attributes
      const fieldAttr = _.keys(fieldOptions);
      const fieldName = this.options.camelCase ? _.camelCase(field) : field;
      
      // Serial key for postgres...
      let defaultVal = fieldOptions.defaultValue;
      
      // ENUMs for postgres...
      if (fieldOptions.type === "USER-DEFINED" && !!fieldOptions.special) {
        fieldOptions.type = "ENUM(" + fieldOptions.special.join(",") + ")";
      }
      
      const isUnique = fieldOptions.foreignKey && fieldOptions.foreignKey.isUnique;
      memo += this.spacesR(2) + getKeyName(fieldName) + ": {\n";
      memo += fieldAttr.reduce((str, attr) => {
        const isSerialKey = fieldOptions.foreignKey && _.isFunction(this.dialect.isSerialKey) && this.dialect.isSerialKey(fieldOptions.foreignKey);
        
        // We don't need the special attribute from postgresql describe table..
        if (attr === "special") {
          return str;
        }
        
        let attrValue = fieldOptions[attr];
        if (attr === "foreignKey") {
          if (isSerialKey) {
            str += this.spacesR(3) + "autoIncrement: true";
          } else if (foreignKey.isForeignKey) {
            str += `${this.spacesR(3)}references: {
${this.spacesR(4)}model: '${attrValue.foreignSources.target_table}',
${this.spacesR(4)}key: '${attrValue.foreignSources.target_column}'
${this.spacesR(3)}}`;
          } else return str;
        } else if (attr === "primaryKey") {
          if (attrValue === true && (!_.has(fieldOptions, "foreignKey") || (_.has(fieldOptions, "foreignKey") && !!fieldOptions.foreignKey.isPrimaryKey)))
            str += this.spacesR(3) + "primaryKey: true";
          else return str;
        } else if (attr === "autoIncrement") {
          if (attrValue === true && !isSerialKey)
            str += this.spacesR(3) + "autoIncrement: true";
          else return str;
        } else if (attr === "comment") {
          if (attrValue)
            str += this.spacesR(3) + `comment: '${attrValue}'`;
          else
            return str;
        } else if (attr === "allowNull") {
          if (attrValue === false) {
            str += this.spacesR(3) + "allowNull: false";
          } else return str;
        } else if (attr === "defaultValue") {
          if (this.sequelize.options.dialect === "mssql" && defaultVal && defaultVal.toLowerCase() === "(newid())") {
            defaultVal = null; // disable adding "default value" attribute for UUID fields if generating for MS SQL
          }
          
          let val_text = defaultVal;
          
          if (isSerialKey) return str;
          
          //mySql Bit fix
          if (fieldOptions.type.toLowerCase() === "bit(1)") {
            val_text = defaultVal === "b'1'" ? 1 : 0;
          }
          // mssql bit fix
          else if (this.sequelize.options.dialect === "mssql" && fieldOptions.type.toLowerCase() === "bit") {
            val_text = defaultVal === "((1))" ? 1 : 0;
          }
          
          if (_.isString(defaultVal)) {
            const field_type = fieldOptions.type.toLowerCase();
            if (_.endsWith(defaultVal, "()")) {
              val_text = "sequelize.fn('" + defaultVal.replace(/\(\)$/, "") + "')";
            } else if (field_type.indexOf("date") === 0 || field_type.indexOf("timestamp") === 0) {
              if (_.includes(["current_timestamp", "current_date", "current_time", "localtime", "localtimestamp"], defaultVal.toLowerCase())) {
                val_text = "sequelize.literal('" + defaultVal + "')";
              } else {
                val_text = quoteWrapper + val_text + quoteWrapper;
              }
            } else {
              val_text = quoteWrapper + val_text + quoteWrapper;
            }
          }
          
          if (defaultVal === null || defaultVal === undefined) {
            return str;
          } else {
            val_text = _.isString(val_text) ? SqlString.escape(_.trim(val_text, "\""), null, this.options.dialect) : val_text;
            
            // don't prepend N for MSSQL when building models...
            val_text = _.trimStart(val_text, "N");
            str += this.spacesR(3) + attr + ': ' + val_text;
          }
        } else if (attr === "type") {
          str += this.spacesR(3) + attr + ': ' + mapType(attrValue, true)
        } else {
          let val = quoteWrapper + attrValue + quoteWrapper;
          str += this.spacesR(3) + attr + ": " + val;
        }
        str += ",";
        str += "\n";
        return str;
      }, '');
      
      if (fieldName === 'id' && !hasPK) {
        memo += this.spacesR(3) + "primaryKey: true,\n";
      }
      
      if (isUnique) {
        memo += this.spacesR(3) + "unique: true,\n";
      }
      
      if (this.options.camelCase && fieldName !== field) {
        memo += this.spacesR(3) + "field: '" + field + "',\n";
      }
      memo = memo.trim().replace(/,+$/, "") + "\n";
      memo += this.spacesR(2) + "}";
      if ((i + 1) < fields.length) {
        memo += ",";
      }
      memo += "\n";
      return memo;
    }, '');
    
    attrsText += this.spacesR() + "}";
    return attrsText;
  }
  
  _generateOptionText(table) {
    const hasadditional = _.isObject(this.options.additional) && _.keys(this.options.additional).length > 0;
    let optionText = "{\n";
    optionText += this.spacesR(2) + "tableName: '" + table + "',\n";
    if (this.tablesComments[table]) {
      optionText += this.spacesR(2) + "comment: '" + this.tablesComments[table] + "',\n";
    }
    if (hasadditional) {
      _.each(this.options.additional, (value, key) => {
        if (key === "name") {
          // name: true - preserve table name always
          optionText += this.spacesR(2) + "name: {\n";
          optionText += this.spacesR(3) + "singular: '" + table + "',\n";
          optionText += this.spacesR(3) + "plural: '" + table + "'\n";
          optionText += this.spacesR(3) + "},\n";
        } else {
          value = _.isBoolean(value) ? value : ("'" + value + "'");
          optionText += this.spacesR(2) + key + ": " + value + ",\n";
        }
      });
    }
    optionText = optionText.trim();
    optionText = optionText.substring(0, optionText.length - 1);
    optionText += "\n" + this.spacesR() + "}";
    return optionText;
  }
  
  _generateText(table) {
    const tableName = this.options.camelCase ? _.camelCase(table) : table;
    this.tablesText[table] = "";
    const headerText = `/* jshint indent: ${this.options.indentation}*/
${this.options.isEgg ? `module.exports = app => {\n${this.spacesR()}const DataTypes = app.Sequelize;` : "module.exports = function (sequelize, DataTypes) {"}
${this.spacesR()}const Model = ${this.options.isEgg ? 'app.model' : 'sequelize'}.define('${tableName}', `;
    this.tablesText[table] += headerText;
    this.tablesText[table] += this._generateAttrText(table);
    this.tablesText[table] += ', ';
    this.tablesText[table] += this._generateOptionText(table);
    this.tablesText[table] += `);`
    if (!this.hasPk(table)) {
      this.tablesText[table] += `\n${this.spacesR()}Model.removeAttribute("id")`
    }
    this.tablesText[table] += `\n\n${this.spacesR()}Model.associate = function (models) {\n${this.spacesR(2)}//  Model.hasMany(${this.options.isEgg ? 'app.model.xx' : 'models.xx'}, {sourceKey: "xx", foreignKey: "xx"});\n${this.spacesR()}};\n${this.spacesR()}return Model;\n};\n`;
  }
  
  
  _write(attributes, typescriptFiles, indexExplorers) {
    const tables = _.keys(attributes);
    mkdirp.sync(path.resolve(this.options.directory));
    return Promise.all([...tables.map(table => {
      const fileName = this.options.camelCaseForFileName ? _.camelCase(table) : table;
      return this._writeFile(path.resolve(path.join(this.options.directory, fileName + (this.options.typescript ? ".ts" : ".js"))), attributes[table]);
    }), (() => {
      if (this.options.typescript) {
        if (typescriptFiles !== null && typescriptFiles.length > 1) {
          return Promise.all([
            this._writeFile(path.join(this.options.directory, "db.d.ts"), typescriptFiles[0], "utf8"),
            this._writeFile(path.join(this.options.directory, "db.tables.ts"), typescriptFiles[1], "utf8")]);
        }
      } else if (!this.options.isEgg) {
        return this._writeFile(path.join(this.options.directory, "index.js"), indexExplorers, "utf8");
      }
    })()]).then(() => {
      if (this.options.eslint) {
        const engine = new CLIEngine({fix: true});
        const report = engine.executeOnFiles([this.options.directory]);
        CLIEngine.outputFixes(report);
      }
    });
  }
  
  _writeFile(...args) {
    return new Promise((resolve, reject) => {
      fs.writeFile(...args, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      });
    });
  }
  
  
}

module.exports = AutoSequelize;