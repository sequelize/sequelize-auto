// put in seperate file to keep main sequelize-auto clean
'use strict';

function getModelFileStart(spaces, tableName) {
    var s = 'import sequelize, { DataTypes } from \'sequelize\';\n';
    s += 'import { ' + tableName + 'Instance, ' + tableName + 'Attribute } from \'./db.d\';\n\n';
    s += "module.exports = function(sequelize:sequelize.Sequelize, DataTypes:DataTypes) {\n";
    s += spaces + 'return sequelize.define<' + tableName + 'Instance, ' + tableName + 'Attribute>(\'' + tableName + '\', {\n';
    return s;
}

exports.model = {
    getModelFileStart
}

function getDefinitionFileStart() {
    return 'import Sequelize from \'sequelize\';\n\n';
}

function getTableDefinition(tsTableDefAttr, tableName) {
    var s = '// table: ' + tableName + '\n';
    s += tsTableDefAttr + '\n}\n';
    s += 'export interface ' + tableName + 'Instance extends Sequelize.Instance<' + tableName + 'Attribute>, ' + tableName + 'Attribute { }\n';
    s += 'export interface ' + tableName + 'Model extends Sequelize.Model<' + tableName + 'Instance, ' + tableName + 'Attribute> { }\n';
    return s;
}

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
        m += 'boolean';
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