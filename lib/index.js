const Sequelize = require('sequelize');
const async = require('async');
const fs = require('graceful-fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');
const dialects = require('./dialects');
const _ = require('lodash');
const tsHelper = require('./ts-helper');
const CLIEngine = require('eslint').CLIEngine;

function AutoSequelize(database, username, password, options) {
  if (options && options.dialect === 'sqlite' && !options.storage) {
    options.storage = database;
  }
  if (options && options.dialect === 'mssql') {
    // set defaults for tedious, to silence the warnings
    options.dialectOptions = options.dialectOptions || {};
    options.dialectOptions.options = options.dialectOptions.options || {};
    options.dialectOptions.options.trustServerCertificate = true;
    options.dialectOptions.options.enableArithAbort = true;
  }

  if (database instanceof Sequelize) {
    this.sequelize = database;
  } else {
    this.sequelize = new Sequelize(database, username, password, options || {});
  }

  this.queryInterface = this.sequelize.getQueryInterface();
  this.tables = {};
  this.foreignKeys = {};
  this.hasTriggerTables = {};
  this.dialect = dialects[this.sequelize.options.dialect];

  this.options = _.extend({
    global: 'Sequelize',
    local: 'sequelize',
    spaces: false,
    indentation: 1,
    directory: './models',
    additional: {},
    freezeTableName: true,
    typescript: false,
    camelCaseFileName: false,
    closeConnectionAutomatically: true
  }, options || {});
}

AutoSequelize.prototype.build = function(callback) {
  const self = this;

  function makeTableQName(table) {
    return [table.table_schema, table.table_name].filter(Boolean).join(".");
  }

  function mapTable(table, _callback){
    self.queryInterface.describeTable(table.table_name, table.table_schema).then(function(fields) {
      self.tables[makeTableQName(table)] = fields
      var countTriggerSql = self.dialect.countTriggerQuery(table.table_name, table.table_schema);
      self.sequelize.query(countTriggerSql, {
        raw: true,
        type: self.sequelize.QueryTypes.SELECT,
      }).then(function(triggerCount) {
        triggerCount = parseInt(triggerCount && triggerCount[0] && triggerCount[0].trigger_count)
        if (triggerCount > 0)
          self.hasTriggerTables[makeTableQName(table)] = true;
        _callback()
      }, _callback);
    }, _callback);
  }

  if (this.dialect.showTablesQuery) {
    const showTablesSql = this.dialect.showTablesQuery(self.options.schema);
    self.sequelize.query(showTablesSql, {
      raw: true,
      type: self.sequelize.QueryTypes.SELECT
    }).then(processTables, callback);
  } else {
    this.queryInterface.showAllTables().then(processTables, callback);
  }

  function processTables(tables) {
    function compareFn(a, b) {
      return a.table_name === b.table_name && (b.table_schema === null || a.table_schema === b.table_schema);
    };

    // option tables are a list of strings; each string is either
    // table name (e.g. "Customer") or schema dot table name (e.g. "dbo.Customer")
    function mapOptionTables(arr) {
      return _.map(arr, (t) => {
        var sp = t.split('.');
        return {
          table_name: sp[sp.length - 1],
          table_schema: sp.length > 1 ? sp[sp.length - 2] : (self.options.schema || null)
        };
      });
    }

    // tables is an array of either two things:
    // * objects with two properties table_name and table_schema
    // * objects with a single name property
    // The first happens for dialects which support schemas (e.g. mssql, postgres).
    // The second happens for dialects which do not support schemas (e.g. sqlite).

    tables = _.map(tables, (t) => {
      return {
        table_name: t.table_name || t.name || String(t),
        table_schema: t.table_schema || self.options.schema || null
      };
    });

    if (self.options.tables) {
      var optables = mapOptionTables(self.options.tables);
      tables = _.intersectionWith(tables, optables, compareFn);
    } else if (self.options.skipTables) {
      var skipTables = mapOptionTables(self.options.skipTables);
      tables = _.differenceWith(tables, skipTables, compareFn);
    }

    async.each(tables, mapForeignKeys, mapTables);

    function mapTables(err) {
      if (err) {
        callback(err);
      } else {
        async.each(tables, mapTable, callback);
      }
    }
  }

  function mapForeignKeys(table, fn) {
    if (!self.dialect) {
      return fn();
    }

    const tableQname = makeTableQName(table)
    const sql = self.dialect.getForeignKeysQuery(table.table_name, table.table_schema);
    self.sequelize.query(sql, {
      type: self.sequelize.QueryTypes.SELECT,
      raw: true
    }).then(function (res) {
      _.each(res, assignColumnDetails);
      fn();
    }, fn);

    function assignColumnDetails(ref) {
      if (self.dialect.remapForeignKeysRow) {
        ref = self.dialect.remapForeignKeysRow(table.table_name, ref);
      }

      if (! _.isEmpty(_.trim(ref.source_column)) && ! _.isEmpty(_.trim(ref.target_column))) {
        ref.isForeignKey = true;
        ref.foreignSources = _.pick(ref, ['source_table', 'source_schema', 'target_schema', 'target_table', 'source_column', 'target_column']);
      }
      if (_.isFunction(self.dialect.isUnique) && self.dialect.isUnique(ref)) {
        ref.isUnique = true;
      }
      if (_.isFunction(self.dialect.isPrimaryKey) && self.dialect.isPrimaryKey(ref)) {
        ref.isPrimaryKey = true;
      }
      if (_.isFunction(self.dialect.isSerialKey) && self.dialect.isSerialKey(ref)) {
        ref.isSerialKey = true;
      }

      self.foreignKeys[tableQname] = self.foreignKeys[tableQname] || {};
      self.foreignKeys[tableQname][ref.source_column] = _.assign({}, self.foreignKeys[tableQname][ref.source_column], ref);
    }
  }
}

AutoSequelize.prototype.run = function(callback) {
  var self = this;
  var text = {};
  var typescriptFiles = [self.options.typescript ? tsHelper.def.getDefinitionFileStart() : '', ''];

  this.build(generateText);

  function generateText(err) {
    if (err) {
      callback(err);
      return;
    }

    const quoteWrapper = '"';

    async.each(_.keys(self.tables), function(table, _callback){
      var [schemaName, tableNameOrig] = qNameSplit(table);
      var fields = _.keys(self.tables[table]);
      let spaces = '';

      for (var x = 0; x < self.options.indentation; ++x) {
        spaces += (self.options.spaces === true ? ' ' : "\t");
      }

      var tableName = tableNameOrig;
      if (self.options.camelCase) {
        tableName = _.camelCase(tableNameOrig);
        if (self.options.camelCase === 'ut') {
          tableName = _.upperFirst(tableName);
        }
      }

      var tsTableDef = self.options.typescript ? 'export interface ' + tableName + 'Attribute {' : '';
      var str;

      if(!self.options.typescript){
        str = "/* jshint indent: " + self.options.indentation + " */\n\n";

        if (self.options.es6) {
          str += "const Sequelize = require('sequelize');\n"
          str += "module.exports = (sequelize, DataTypes) => {\n";
          str += spaces + "return " + tableName + ".init(sequelize, DataTypes);\n";
          str += "}\n\n";
          str += "class " + tableName + " extends Sequelize.Model {\n";
          str += spaces + "static init(sequelize, DataTypes) {\n";
          str += spaces + "super.init({\n";
        } else if (self.options.esm) {
          str += "import { Model } from 'sequelize';\n\n"
          str += "export default class " + tableName + " extends Model {\n";
          str += spaces + "static init(sequelize, DataTypes) {\n";
          str += spaces + "super.init({\n";
        } else {
          str += "module.exports = function(sequelize, DataTypes) {\n";
          str += spaces + "return sequelize.define('" + tableName + "', {\n";
        }

      } else {
        str = tsHelper.model.getModelFileStart(self.options.indentation, spaces, tableName);
      }

      _.each(fields, function(field, i) {
          const additional = self.options.additional;
          if( additional && additional.timestamps !== undefined && additional.timestamps) {
            if((additional.createdAt && field === 'createdAt' || additional.createdAt === field )
              || (additional.updatedAt && field === 'updatedAt' || additional.updatedAt === field )
              || (additional.deletedAt && field === 'deletedAt' || additional.deletedAt === field )) {
              return true;
            }
          }
        // Find foreign key
        var foreignKey = self.foreignKeys[table] && self.foreignKeys[table][field] ? self.foreignKeys[table][field] : null;
        var fieldObj = self.tables[table][field];

        if (_.isObject(foreignKey)) {
          fieldObj.foreignKey = foreignKey;
        }

        // column's attributes
        var fieldAttr = _.keys(fieldObj);
        var fieldName = self.options.camelCase ? _.camelCase(field) : field;

        // quote fieldname if not a valid identifier
        str += spaces + spaces + (/^[$A-Z_][0-9A-Z_$]*$/i.test(fieldName) ? fieldName : "'" + fieldName + "'") + ": {\n";

        var defaultVal = fieldObj.defaultValue;

        // ENUMs for postgres...
        if (fieldObj.type === "USER-DEFINED" && !!fieldObj.special) {
          fieldObj.type = "ENUM(" + fieldObj.special.map(function(f){
            return quoteWrapper + f + quoteWrapper; }).join(',') + ")";
        }

        // typescript
        var tsVal = '';

        var isUnique = fieldObj.foreignKey && fieldObj.foreignKey.isUnique;
        var wroteUnique = false;

        var isSerialKey = _.isFunction(self.dialect.isSerialKey) &&
          (self.dialect.isSerialKey(fieldObj) ||
          (fieldObj.foreignKey && self.dialect.isSerialKey(fieldObj.foreignKey)));
        var wroteAutoIncrement = false;

        _.each(fieldAttr, function(attr) {

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
              if(self.options.schema) {
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
          } else if (attr === "unique") {
            var uniq = fieldObj[attr];
            if (uniq && !wroteUnique) {
              uniq = _.isString(uniq) ? '\'' + uniq.replace("'", "\\'") + '\'' : uniq;
              str += spaces + spaces + spaces + "unique: " + uniq + ",\n";
              wroteUnique = true;
            }
            return true;
          } else if (attr === "allowNull") {
            str += spaces + spaces + spaces + attr + ": " + fieldObj[attr];
            if(self.options.typescript) {
              tsAllowNull = fieldObj[attr];
            }
          } else if (attr === "defaultValue") {
            var localName = fieldName;
            if (self.sequelize.options.dialect === "mssql" && defaultVal && defaultVal.toLowerCase() === '(newid())') {
              defaultVal = null; // disable adding "default value" attribute for UUID fields if generating for MS SQL
            }

            if(defaultVal === null || defaultVal === undefined) {
              return true;
            }
            if (isSerialKey) {
              return true; // value generated in the database
            }

            var val_text = defaultVal;
            if (_.isString(defaultVal)) {
              var field_type = fieldObj.type.toLowerCase();

              if (field_type === 'bit(1)' || field_type === 'bit' || field_type === 'boolean') {
                // convert string to boolean
                val_text = /1|true/i.test(defaultVal) ? true : false;

              } else if (field_type.match(/^(smallint|mediumint|tinyint|int|bigint|float|money|smallmoney|double|decimal)/)) {
                // remove () around mssql numeric values
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
            var _attr = (fieldObj[attr] || '').toLowerCase();
            var val;

            if (_attr === "boolean" || _attr === "bit(1)" || _attr === "bit") {
              val = 'DataTypes.BOOLEAN';
            }
            else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
              var length = _attr.match(/\(\d+\)/);
              val = 'DataTypes.INTEGER' + (!  _.isNull(length) ? length : '');

              var unsigned = _attr.match(/unsigned/i);
              if (unsigned) {
                val += '.UNSIGNED';
              }
              var zero = _attr.match(/zerofill/i);
              if (zero) {
                val += '.ZEROFILL';
              }
            }
            else if (_attr.match(/^bigint/)) {
              val = 'DataTypes.BIGINT';
            }
            else if (_attr.match(/^n?varchar/)) {
              var length = _attr.match(/\(\d+\)/);
              val = 'DataTypes.STRING' + (!  _.isNull(length) ? length : '');
            }
            else if (_attr.match(/^string|varying|nvarchar/)) {
              val = 'DataTypes.STRING';
            }
            else if (_attr.match(/^n?char/)) {
              var length = _attr.match(/\(\d+\)/);
              val = 'DataTypes.CHAR' + (!  _.isNull(length) ? length : '');
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
              val = _.isString(val) ? '\'' + val.replace("'", "\\'") + '\'' : val;
            }

            str += spaces + spaces + spaces + attr + ": " + val;
            if(self.options.typescript) {
              tsVal = val;
            }
          }

          str += ",\n";
        });

        if (isUnique && !wroteUnique) {
          str += spaces + spaces + spaces + "unique: true,\n";
        }

        if (field != fieldName) {
          str += spaces + spaces + spaces + "field: '" + field + "',\n";
        }

        // removes the last `,` within the attribute options
        str = str.trim().replace(/,+$/, '') + "\n";

        str += spaces + spaces + "}";
        if ((i+1) < fields.length) {
          str += ",";
        }
        str += "\n";

        // typescript, get definition for this field
        if(self.options.typescript) {
          tsTableDef += tsHelper.def.getMemberDefinition(spaces, fieldName, tsVal, tsAllowNull);
        }
      });

      str += spaces + "}";

      //conditionally add additional options to tag on to orm objects
      var hasadditional = _.isObject(self.options.additional) && _.keys(self.options.additional).length > 0;

      str += ", {\n";
      str += spaces + spaces  + "sequelize,\n";
      str += spaces + spaces  + "tableName: '" + tableNameOrig + "',\n";

      if(schemaName) {
        str += spaces + spaces  + "schema: '" + schemaName + "',\n";
      }

      if (self.hasTriggerTables[table]) {
        str += spaces + spaces  + "hasTrigger: true,\n";
      }

      if (hasadditional) {
        _.each(self.options.additional, addAdditionalOption);
      }

      str = str.trim();
      str = str.substring(0, str.length - 1);
      str += "\n" + spaces + "}";

      // typescript end table in definitions file
      if(self.options.typescript) {
        typescriptFiles[0] += tsHelper.def.getTableDefinition(tsTableDef, tableName);
      }

      function addAdditionalOption(value, key) {
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
      }

      //resume normal output
      str += ");\n";
      if (self.options.es6 || self.options.esm) {
        str += spaces + "return " + tableName + ";\n";
        str += spaces + "}\n}\n";
      } else {
        str += "};\n";
      }
      text[table] = str;

      _callback(null);
    }, function(){
      if (self.options.closeConnectionAutomatically) {
        self.sequelize.close();
      }

      // typescript generate tables
      if(self.options.typescript) {
        typescriptFiles[1] = tsHelper.model.generateTableModels(_.keys(text), self.options.spaces, self.options.indentation, self.options.camelCase, self.options.camelCaseFileName);
      }

      if (self.options.directory) {
        return self.write(text, typescriptFiles, callback);
      }
      return callback(false, text);
    });
  }
};

AutoSequelize.prototype.write = function(attributes, typescriptFiles, callback) {
  const tables = _.keys(attributes);
  const self = this;

  function createFile(table, callback) {
    // FIXME: schema is not used to write the file name and there could be collisions. For now it
    // is up to the developer to pick the right schema, and potentially chose different output
    // folders for each different schema.
    var [schemaName, tableName] = qNameSplit(table);
    var fileName = self.options.camelCaseFileName ? _.camelCase(tableName) : tableName;
    if (self.options.camelCaseFileName == 'ut') {
      fileName = _.upperFirst(fileName);
    }
    const filePath = path.join(self.options.directory, fileName + (self.options.typescript ? '.ts' : '.js'));
    fs.writeFile(path.resolve(filePath), attributes[table], callback);
  }

  mkdirp.sync(path.resolve(self.options.directory));

  async.each(tables, createFile, !self.options.eslint ? callback : function() {
    const engine = new CLIEngine({ fix: true });
    const report = engine.executeOnFiles([self.options.directory]);
    CLIEngine.outputFixes(report);
    callback();
  });

  // Write out some Typescript d.ts files
  if (self.options.typescript) {
    if (typescriptFiles !== null && typescriptFiles.length > 1) {
      fs.writeFileSync(path.join(self.options.directory, 'db.d.ts'), typescriptFiles[0], 'utf8');
      fs.writeFileSync(path.join(self.options.directory, 'db.tables.ts'), typescriptFiles[1], 'utf8');
    }
  }
};

function qNameSplit(qname) {
  if (qname.indexOf(".") > 0) {
    var [schemaName, tableNameOrig] = qname.split(".");
    return [schemaName, tableNameOrig];
  }
  return [null, qname];
}

module.exports = AutoSequelize;
