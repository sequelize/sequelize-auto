// put in seperate file to keep main sequelize-auto clean
'use strict';

function getModelFileStart(indentation, spaces, tableName) {
    var fileStart = "/* jshint indent: " + indentation + " */\n";
    fileStart += '// tslint:disable \n'
    fileStart += 'import sequelize, { DataTypes } from \'sequelize\';\n';
    fileStart += 'import { ' + tableName + 'Instance, ' + tableName + 'Attribute } from \'./db.d\';\n\n';
    fileStart += "module.exports = function(sequelize:sequelize.Sequelize, DataTypes:DataTypes) {\n";
    fileStart += spaces + 'return sequelize.define<' + tableName + 'Instance, ' + tableName + 'Attribute>(\'' + tableName + '\', {\n';
    return fileStart;
}

exports.model = {
    getModelFileStart
}

function getDefinitionFileStart() {
    return 'import Sequelize from \'sequelize\';\n\n';
}

function getTableDefinition(tsTableDefAttr, tableName) {
    var tableDef = '// table: ' + tableName + '\n';
    tableDef += tsTableDefAttr + '\n}\n';
    tableDef += 'export interface ' + tableName + 'Instance extends Sequelize.Instance<' + tableName + 'Attribute>, ' + tableName + 'Attribute { }\n';
    tableDef += 'export interface ' + tableName + 'Model extends Sequelize.Model<' + tableName + 'Instance, ' + tableName + 'Attribute> { }\n';
    return tableDef;
}

// doing this in ts helper to not clutter up main index if statement
function getMemberDefinition(spaces, fieldName, val, allowNull) {
    var m = '\n' + spaces + fieldName + (allowNull === true ? '?:' : ':');

    if(val.indexOf('DataTypes.BOOLEAN') > 0){
        m += 'boolean';
    } else if(val.indexOf('DataTypes.INTEGER') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.BIGINT') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.STRING') > 0){
        m += 'string';
    } else if(val.indexOf('DataTypes.CHAR') > 0){
        m += 'string';
    } else if(val.indexOf('DataTypes.REAL') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.TEXT') > 0){
        m += 'string';
    } else if(val.indexOf('DataTypes.DATE') > 0){
        m += 'Date';
    } else if(val.indexOf('DataTypes.FLOAT') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.DECIMAL') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.DOUBLE') > 0){
        m += 'number';
    } else if(val.indexOf('DataTypes.UUIDV4') > 0){
        m += 'string';
    } else {
        m += 'any';
    }

    return m + ';';
}

exports.def = {
    getDefinitionFileStart,
    getTableDefinition,
    getMemberDefinition
}