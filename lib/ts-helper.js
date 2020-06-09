// put in seperate file to keep main sequelize-auto clean
"use strict";

const _ = require("lodash");
const { isReferences, isMiddleTable, autoBindAssociate } = require("./utils");

function getModelFileStart(tableName) {
  const type = `${_.upperFirst(_.camelCase(tableName))}ModelStatic`;
  return `// tslint:disable
  import {Sequelize,DataTypes} from 'sequelize';
  import {${type},ITables} from './db.types';
  module.exports = function(sequelize: Sequelize) {
  const Model = <${type}>sequelize.define('${tableName}',
  `;
}

function generateInterface(tableNames, {
  camelCase,
  upperFirstModelName
}, comments) {
  let fileTextOutput = "export interface ITables {\n";
  for (let i = 0; i < tableNames.length; i++) {
    let table = camelCase ? _.camelCase(tableNames[i]) : tableNames[i];
    table = upperFirstModelName ? _.upperFirst(table) : table;
    const tableType = _.upperFirst(_.camelCase(tableNames[i]));
    if (comments[tableNames[i]]) {
      fileTextOutput += `/**
       * ${comments[tableNames[i]]}
       */
      `;
    }
    fileTextOutput += `${table}:${tableType}ModelStatic;\n`;
  }
  fileTextOutput += "}\n\n";
  return fileTextOutput;
}

function generateTableModels(tableNames, {
  camelCase,
  upperFirstModelName,
  camelCaseForFileName
}) {

  return `
  ${generateImports()}
  ${isReferences}
  ${isMiddleTable}
  ${autoBindAssociate}
  ${generateTableMapper()}
  `;

  function generateImports() {
    let fileTextOutput = "import * as path from 'path';\n";
    fileTextOutput += "import {Sequelize} from 'sequelize';\n";
    fileTextOutput += "import * as def from './db.types';\n\n";
    return fileTextOutput;
  }

  function generateTableMapper() {
    let fileTextOutput = "export default function getModels(seq:Sequelize):def.ITables {\n";
    fileTextOutput += "const models:def.ITables = {\n";
    for (let i = 0; i < tableNames.length; i++) {
      let tableForClass = camelCase ? _.camelCase(tableNames[i]) : tableNames[i];
      tableForClass = upperFirstModelName ? _.upperFirst(tableForClass) : tableForClass;
      const tableForFile = camelCaseForFileName ? _.camelCase(tableNames[i]) : tableNames[i];

      fileTextOutput += tableForClass + ": seq.import(path.join(__dirname, './" + tableForFile + "')),\n";
    }
    fileTextOutput += "};\n";
    fileTextOutput += "autoBindAssociate(models);\n"
    fileTextOutput += "return models;\n";
    fileTextOutput += "};\n";
    return fileTextOutput;
  }
}


// doing this in ts helper to not clutter up main index if statement
function getMemberDefinition(fieldName, type, allowNull = true) {
  if (fieldName === undefined) return "";
  let m = fieldName + (allowNull === true ? "?:" : ":");
  let val = type.key;
  if (val === undefined) {
    m += "any";
  } else if (val.indexOf("BOOLEAN") > -1) {
    m += "boolean";
  } else if (val.indexOf("INTEGER") > -1) {
    m += "number";
  } else if (val.indexOf("BIGINT") > -1) {
    m += "number";
  } else if (val.indexOf("STRING") > -1) {
    m += "string";
  } else if (val.indexOf("CHAR") > -1) {
    m += "string";
  } else if (val.indexOf("REAL") > -1) {
    m += "number";
  } else if (val.indexOf("TEXT") > -1) {
    m += "string";
  } else if (val.indexOf("DATE") > -1 || val.indexOf("TIME") > -1) {
    m += "Date";
  } else if (val.indexOf("FLOAT") > -1) {
    m += "number";
  } else if (val.indexOf("DECIMAL") > -1) {
    m += "number";
  } else if (val.indexOf("DOUBLE") > -1) {
    m += "number";
  } else if (val.indexOf("UUID") > -1) {
    m += "string";
  } else if (val.indexOf("ENUM") > -1) {
    m += type.values.map(v => `"${v}"`).join(" | ");
  } else if (val.indexOf("JSON") > -1) {
    m += "object";
  } else if (val.indexOf("BLOB") > -1) {
    m += "Blob";
  } else {
    m += "any";
  }

  return m + ";";
}

module.exports = {
  getModelFileStart,
  generateTableModels,
  getMemberDefinition,
  generateInterface
};
