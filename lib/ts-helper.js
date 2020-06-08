// put in seperate file to keep main sequelize-auto clean
'use strict';
const _ = require('lodash');

function getModelFileStart(indentation, spaces, tableName) {
  var fileStart = "/* jshint indent: " + indentation + " */\n";
  fileStart += '// tslint:disable\n';
  fileStart += 'import * as sequelize from \'sequelize\';\n';
  fileStart += 'import {DataTypes} from \'sequelize\';\n';
  fileStart += 'import {' + tableName + 'Instance, ' + tableName + 'Attribute} from \'./db\';\n\n';
  fileStart += "module.exports = function(sequelize: sequelize.Sequelize, DataTypes: DataTypes) {\n";
  fileStart += spaces + 'return sequelize.define<' + tableName + 'Instance, ' + tableName + 'Attribute>(\'' + tableName + '\', {\n';
  return fileStart;
}

function generateTableModels(tableNames, isSpaces, indentation, isCamelCase, isCamelCaseForFile) {
  tableNames = _.sortBy(tableNames);
  var spaces = '';
  for (var i = 0; i < indentation; ++i) {
    spaces += (isSpaces === true ? ' ' : "\t");
  }

  return generateImports() + generateInterface() + generateTableMapper();

  function transferTableName(tableName) {
    var result;
    if (isCamelCase) {
      result = _.camelCase(tableName);
      if (isCamelCase === 'ut') {
        result = _.upperFirst(result);
      }
    } else {
      result = tableName;
    }
    return result;
  }

  function generateImports() {
    var fileTextOutput = '// tslint:disable\n';
    fileTextOutput += 'import * as path from \'path\';\n';
    fileTextOutput += 'import * as sequelize from \'sequelize\';\n';
    fileTextOutput += 'import * as def from \'./db\';\n\n';
    return fileTextOutput;
  }

  function generateInterface() {
    var fileTextOutput = 'export interface ITables {\n';
    for (var i = 0; i < tableNames.length; i++) {
      var table = transferTableName(tableNames[i])

      fileTextOutput += spaces + table + ': def.' + table + 'Model;\n';
    }
    fileTextOutput += '}\n\n';
    return fileTextOutput;
  }

  function generateTableMapper() {
    var helperMethod = 'function load(filePath: string) {\n' + spaces + spaces + 'return seq.import(path.join(__dirname, filePath));\n' + spaces + '}\n\n'
    var fileTextOutput = 'export const getModels = function(seq: sequelize.Sequelize): ITables {\n\n';
    fileTextOutput += spaces + helperMethod;
    fileTextOutput += spaces + 'return {\n';
    for (var i = 0; i < tableNames.length; i++) {
      var tableForClass = transferTableName(tableNames[i]);
      var tableForFile = isCamelCaseForFile ? _.camelCase(tableNames[i]) : tableNames[i];

      fileTextOutput += spaces + spaces + tableForClass + ': load(\'' + tableForFile + '\'),\n';
    }
    fileTextOutput += spaces + '} as ITables;\n};';
    return fileTextOutput;
  }
}

exports.model = {
  getModelFileStart,
  generateTableModels
};

function getDefinitionFileStart() {
  return '// tslint:disable\nimport * as Sequelize from \'sequelize\';\n\n';
}

function getTableDefinition(tsTableDefAttr, tableName) {
  var tableDef = '\n// table: ' + tableName + '\n';
  tableDef += tsTableDefAttr + '\n}\n';
  tableDef += 'export interface ' + tableName + 'Instance extends Sequelize.Instance<' + tableName + 'Attribute>, ' + tableName + 'Attribute { }\n';
  tableDef += 'export interface ' + tableName + 'Model extends Sequelize.Model<' + tableName + 'Instance, ' + tableName + 'Attribute> { }\n';
  return tableDef;
}

var typeMap = {
  BOOLEAN: 'boolean',
  INTEGER: 'number',
  BIGINT: 'number',
  REAL: 'number',
  FLOAT: 'number',
  DECIMAL: 'number',
  DOUBLE: 'number',
  STRING: 'string',
  CHAR: 'string',
  TEXT: 'string',
  UUIDV4: 'string',
  DATE: 'Date'
};

function getType(val) {
  if (!val) {
    return 'any';
  }
  var result = val.match(/DataTypes\.([A-Z]+)/);
  if (!result) {
    return 'any';
  }
  var dataType = typeMap[result[1]];
  return dataType || 'any';
}

// doing this in ts helper to not clutter up main index if statement
function getMemberDefinition(spaces, fieldName, val) {
  if (fieldName === undefined) {
    return '';
  }
  return '\n' + spaces + fieldName + '?:' + getType(val) + ';';
}

exports.def = {
  getDefinitionFileStart,
  getTableDefinition,
  getMemberDefinition
};