/**
 * User: puti.
 * Time: 2020-05-17 17:14.
 */
// 不能删除,提供eval 需要的环境
const { Sequelize, DataTypes } = require("sequelize");
const dialects = require("./dialects");
const tsHelper = require("./ts-helper");
const { mapType, autoBindAssociate, generateIndexExplorer, getKeyName } = require("./utils");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const prettier = require("prettier");
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
    this.tablesAttributes = {};
    this.tablesOptions = {};
    this.tablesAttributesText = {};
    this.tablesOptionsText = {};
    this.typesText = "";
    this.tablesText = {};
    this.foreignKeys = {};
    this.tablesComments = {};
    this.dialect = dialects[this.sequelize.options.dialect];

    this.options = Object.assign({
      global: "Sequelize",
      local: "sequelize",
      directory: "./models",
      additional: {},
      isEgg: false,
      typescript: false,
      camelCase: true,
      upperFirstModelName: false,
      camelCaseForFileName: true
    }, options || {});
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
      tables = _.flatten(tableNames);
    } else {
      tables = await this.queryInterface.showAllTables();
    }
    await this._processTables(tables);
    Object.keys(this.tables).forEach(table => this._generateValues(table));
    this.isReady = true;
    return this;
  }


  /**
   * sequelize define model
   * @returns {AutoSequelize}
   */
  initModels() {
    if (!this.isReady) throw new Error("wait prepare");
    Object.keys(this.tables).forEach(table => this._map2Attributes(table));
    autoBindAssociate(this.sequelize.models);
    return this;
  }

  /**
   * 生成文件
   * @returns {Promise<never>|Promise<any | never>}
   */
  outputFiles() {
    if (!this.isReady) throw new Error("wait prepare");
    const indexExplorers = generateIndexExplorer(_.keys(this.tablesText), this.options);
    if (this.options.directory) {
      return this._write(this.tablesText, [], indexExplorers);
    } else {
      return Promise.reject("no output directory");
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
    this.tables[table] = await this.queryInterface.describeTable(table, this.options.schema);
  }

  async _mapForeignKeys(table) {
    if (!this.dialect) return;

    const sql = this.dialect.getForeignKeysQuery(table, this.sequelize.config.database);
    const res = await this.sequelize.query(sql, {
      type: this.sequelize.QueryTypes.SELECT,
      raw: true
    });
    res.forEach(t => {
      this._assignColumnDetails(t, table);
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

  _getTimeField(tag) {
    const additional = this.options.additional;
    if (additional.timestamps === false || additional[tag] === false) {
      return "";
    }
    if (additional[tag] === true) {
      return tag;
    }
    if (_.isString(additional[tag])) {
      return additional[tag];
    }
    if (tag === "deletedAt") return "";
    return tag;
  }

  _isTimeField(field) {
    const additional = this.options.additional;
    if (additional.timestamps === false) {
      return false;
    }
    const createdField = this._getTimeField("createdAt");
    const updatedField = this._getTimeField("updatedAt");
    const deletedField = this._getTimeField("deletedAt");
    return [createdField, updatedField, deletedField].includes(field);
  }

  _map2Attributes(table) {
    const model = this.sequelize.define(this._getModelName(table), this.tablesAttributes[table], {
      timestamps: true,
      ...this.tablesOptions[table]
    });
    if (!this.hasPk(table)) {
      model.removeAttribute("id");
    }
  }

  hasPk(table) {
    const fields = _.keys(this.tables[table]);
    return fields.some(key => this.tables[table][key].primaryKey);
  }

  _getModelName(tableName) {
    if (this.options.camelCase) {
      tableName = _.camelCase(tableName);
    }
    if (this.options.upperFirstModelName) {
      tableName = _.upperFirst(tableName);
    }
    return tableName;
  }

  /**
   * 生成 ModelAttributes 字符串
   * @param table
   * @returns {string}
   * @private
   */
  _generateAttrText(table) {
    const fields = _.keys(this.tables[table]);
    const hasPK = this.hasPk(table);
    return fields.reduce((memo, field, i) => {
      if (this._isTimeField(field)) {
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
      memo += getKeyName(fieldName) + ": ";
      memo += fieldAttr.reduce((str, attr) => {
        const isSerialKey = fieldOptions.foreignKey && _.isFunction(this.dialect.isSerialKey) && this.dialect.isSerialKey(fieldOptions.foreignKey);

        // We don't need the special attribute from postgresql describe table..
        if (attr === "special") {
          return str;
        }

        let attrValue = fieldOptions[attr];
        if (attr === "foreignKey") {
          if (isSerialKey) {
            str += "autoIncrement: true";
          } else if (foreignKey.isForeignKey) {
            str += `references: {model: "${this._getModelName(attrValue.foreignSources.target_table)}",key: '${attrValue.foreignSources.target_column}'}`;
          } else return str;
        } else if (attr === "primaryKey") {
          if (attrValue === true && (!_.has(fieldOptions, "foreignKey") || (_.has(fieldOptions, "foreignKey") && !!fieldOptions.foreignKey.isPrimaryKey)))
            str += "primaryKey: true";
          else return str;
        } else if (attr === "autoIncrement") {
          if (attrValue === true && !isSerialKey)
            str += "autoIncrement: true";
          else return str;
        } else if (attr === "comment") {
          if (attrValue)
            str += `comment: "${attrValue.replace(/[\r\n]/g, "")}"`;
          else
            return str;
        } else if (attr === "allowNull") {
          if (attrValue === false) {
            str += "allowNull: false";
          } else return str;
        } else if (attr === "defaultValue") {
          if (this.sequelize.options.dialect === "mssql" && defaultVal && defaultVal.toLowerCase() === "(newid())") {
            defaultVal = null; // disable adding "default value" attribute for UUID fields if generating for MS SQL
          }
          if (defaultVal === null) return str;

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
                val_text = "DataTypes.NOW";
                str += `${attr}:${val_text}`;
                return str + ",";
              }
            }
          }

          if (_.isEmpty(defaultVal)) {
            return str;
          } else {
            // don't prepend N for MSSQL when building models...
            let trimStart = _.trimStart(val_text, "N");
            str += `${attr}:"${trimStart}"`;
          }
        } else if (attr === "type") {
          str += `${attr}:${mapType(attrValue, true)}`;
        } else {
          str += `${attr}:"${attrValue}"`;
        }
        return str + ",";
      }, "{");

      if (fieldName === "id" && !hasPK) memo += "primaryKey: true,";

      if (isUnique) memo += "unique: true,";

      if (this.options.camelCase && fieldName !== field) memo += `field: "${field}",`;

      memo += "},";
      return memo;
    }, "{") + "}";
  }

  _generateOptionText(table) {
    const hasAdditional = _.isObject(this.options.additional) && _.keys(this.options.additional).length > 0;
    let optionText = `{tableName: "${table}",`;
    if (this.tablesComments[table]) {
      optionText += `comment: "${this.tablesComments[table]}",`;
    }
    if (hasAdditional) {
      _.each(this.options.additional, (value, key) => {
        if (key === "name") {
          optionText += `name: {singular: "${table}",plural:"${table}"},`;
        } else {
          value = _.isBoolean(value) ? value : ("'" + value + "'");
          optionText += key + ": " + value + ",";
        }
      });
    }
    optionText += "}";
    return optionText;
  }

  _generateModelText(table, attrText, optionsText) {
    let modelName = this.options.camelCase ? _.camelCase(table) : table;
    modelName = this.options.upperFirstModelName ? _.upperFirst(modelName) : modelName;
    let text = this.options.typescript ? tsHelper.getModelFileStart(modelName) :
      `${this.options.isEgg ? `
      module.exports = app => {const DataTypes = app.Sequelize;` :
        "const { DataTypes } = require(\"sequelize\");\nmodule.exports = function (sequelize) {"}
const Model = ${this.options.isEgg ? "app.model" : "sequelize"}.define('${modelName}', `;
    text += `${attrText},${optionsText});`;
    if (!this.hasPk(table)) {
      text += `Model.removeAttribute("id");`;
    }
    text += `Model.associate = function (models${this.options.typescript ? ":ITables" : ""}) { \n//  Model.hasMany(${this.options.isEgg ? "app.model.xx" : "models.xx"}, {sourceKey: "xx", foreignKey: "xx"});\n};return Model;};`;
    return this._formatText(text);
  }

  _generateValues(table) {
    const generateAttrText = this._generateAttrText(table);
    this.tablesAttributesText[table] = generateAttrText;
    this.tablesAttributes[table] = eval(`Object.assign(${generateAttrText});`);

    const generateOptionText = this._generateOptionText(table);
    this.tablesOptionsText[table] = generateOptionText;
    this.tablesOptions[table] = eval(`Object.assign(${generateOptionText});`);

    this.tablesText[table] = this._generateModelText(table, generateAttrText, generateOptionText);
    this.typesText = this._formatText(this._generateTypesText(), { parser: "typescript" });
  }

  _generateTypesText() {
    return `${Object.keys(this.tablesAttributes).reduce((memo, key) => {
      const attributes = this.tablesAttributes[key];
      const modelName = _.upperFirst(_.camelCase(key));
      memo += `export interface ${modelName}Model extends TModel {
      ${Object.keys(attributes).reduce((text, attr) => {
        const { type, allowNull, comment, primaryKey, autoIncrement, references } = attributes[attr];
        if (comment) text += `
        /**
         * ${comment}
         */
         `;
        if ((primaryKey && autoIncrement) || this._isTimeField(attr)) {
          text += "readonly ";
        }
        text += tsHelper.getMemberDefinition(attr, type, allowNull);
        return text;
      }, "")}
      };\n\n\n`;
      memo += `export type ${modelName}ModelStatic = ModelStatic<${modelName}Model>;\n`;
      return memo;
    }, `import {Model,ModelCtor} from "sequelize";
    export interface TModel extends Model {
      ${this._getTimeField("createdAt") && `readonly ${this._getTimeField("createdAt")}: Date;`}
      ${this._getTimeField("updatedAt") && `readonly ${this._getTimeField("updatedAt")}: Date;`}
      ${this._getTimeField("deletedAt") && `readonly ${this._getTimeField("deletedAt")}: Date;`}
    }
    export type ModelStatic<M extends TModel> = ModelCtor<M> & {
      associate?: (tables: ITables) => void | boolean;
      };
    `)}
    ${tsHelper.generateInterface(Object.keys(this.tablesAttributes), this.options, this.tablesComments)}
    `;
  }

  _write(attributes, typescriptFiles, indexExplorers) {
    const tables = _.keys(attributes);
    mkdirp.sync(path.resolve(this.options.directory));
    return Promise.all([...tables.map(table => {
      const fileName = this.options.camelCaseForFileName ? _.camelCase(table) : table;
      return this._writeFile(path.resolve(path.join(this.options.directory, fileName + (this.options.typescript ? ".ts" : ".js"))), attributes[table]);
    }), (() => {
      if (this.options.typescript) {
        return Promise.all([
          this._writeFile(path.join(this.options.directory, "index.ts"), this._formatText(tsHelper.generateTableModels(Object.keys(this.tables), this.options))),
          this._writeFile(path.join(this.options.directory, "db.types.ts"), this.typesText)]);
      } else if (!this.options.isEgg) {
        return this._writeFile(path.join(this.options.directory, "index.js"), indexExplorers);
      }
    })()]);
  }

  _formatText(text, options = {}) {
    return prettier.format(text, {
      parser: this.options.typescript ? "typescript" : "babel",
      useTabs: true,
      tabWidth: 4,
      printWidth: 90,
      ...options
    });
  }

  _writeFile(path, text) {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, text, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }


}

module.exports = AutoSequelize;