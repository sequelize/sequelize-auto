/**
 * User: puti.
 * Time: 2020-05-17 23:38.
 */
const {DataTypes} = require('sequelize');
const _ = require('lodash')

function getLengthType(typeValue, typeStr, isStr, {mapInt2Bool} = {}) {
  const length = typeValue.match(/\(\d+\)/);
  if (isStr) {
    return "DataTypes." + typeStr + (!_.isNull(length) ? length : "")
  }
  if (!_.isNull(length)) {
    const number = parseInt(length[0].match(/\d/)[0]);
    return DataTypes[typeStr](number)
  }
  return DataTypes[typeStr];
}

function mapType(attrValue, isStr, {mapInt2Bool = true} = {}) {
  const _attr = (attrValue || "").toLowerCase();
  if (attrValue.indexOf("ENUM") === 0) {
    let values = attrValue.match(/\((.+?)\)/);
    values = values ? values[0] : '';
    values = values.substring(1, values.length - 1).split(',');
    const strings = values.filter(t => t);
    return isStr ? `DataTypes.ENUM(${strings.map(t => `'${t}'`).join(',')})` : DataTypes.ENUM(...(strings || []))
  }
  let type;
  if (_attr === "boolean" || _attr === "bit(1)" || _attr === "bit") {
    type = isStr ? 'DataTypes.BOOLEAN' : DataTypes.BOOLEAN;
  } else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
    type = getLengthType(_attr, "INTEGER", isStr, {mapInt2Bool});
    const unsigned = _attr.match(/unsigned/i);
    if (unsigned) {
      type = isStr ? (type + ".UNSIGNED") : type.UNSIGNED
    }
    const zero = _attr.match(/zerofill/i);
    if (zero) type = isStr ? (type + ".ZEROFILL") : type.ZEROFILL;
  } else if (_attr.match(/^bigint/)) {
    type = isStr ? 'DataTypes.BIGINT' : DataTypes.BIGINT;
  } else if (_attr.match(/^varchar/)) {
    type = getLengthType(_attr, "STRING", isStr)
  } else if (_attr.match(/^string|varying|nvarchar/)) {
    type = isStr ? 'DataTypes.STRING' : DataTypes.STRING;
  } else if (_attr.match(/^char/)) {
    type = getLengthType(_attr, "CHAR", isStr)
  } else if (_attr.match(/^real/)) {
    type = isStr ? 'DataTypes.REAL' : DataTypes.REAL;
  } else if (_attr.match(/^tinytext/)) {
    type = isStr ? "new DataTypes.TEXT('tiny')" : new DataTypes.TEXT('tiny');
  } else if (_attr.match(/^longtext/)) {
    type = isStr ? "new DataTypes.TEXT('long')" : new DataTypes.TEXT('long');
  } else if (_attr.match(/^mediumtext/)) {
    type = isStr ? "new DataTypes.TEXT('medium')" : new DataTypes.TEXT('medium');
  } else if (_attr.match(/text|ntext$/)) {
    type = isStr ? 'DataTypes.TEXT' : DataTypes.TEXT;
  } else if (_attr === "date") {
    type = isStr ? 'DataTypes.DATEONLY' : DataTypes.DATEONLY;
  } else if (_attr.match(/^(date|timestamp)/)) {
    type = isStr ? 'DataTypes.DATE' : DataTypes.DATE;
  } else if (_attr.match(/^(time)/)) {
    type = isStr ? 'DataTypes.TIME' : DataTypes.TIME;
  } else if (_attr.match(/^(float|float4)/)) {
    type = isStr ? 'DataTypes.FLOAT' : DataTypes.FLOAT;
  } else if (_attr.match(/^decimal/)) {
    type = isStr ? 'DataTypes.DECIMAL' : DataTypes.DECIMAL;
  } else if (_attr.match(/^(float8|double precision|numeric)/)) {
    type = isStr ? 'DataTypes.DOUBLE' : DataTypes.DOUBLE;
  } else if (_attr.match(/^uuid|uniqueidentifier/)) {
    type = isStr ? 'DataTypes.UUID' : DataTypes.UUID;
  } else if (_attr.match(/^jsonb/)) {
    type = isStr ? 'DataTypes.JSONB' : DataTypes.JSONB;
  } else if (_attr.match(/^json/)) {
    type = isStr ? 'DataTypes.JSON' : DataTypes.JSON;
  } else if (_attr.match(/^geometry/)) {
    type = isStr ? 'DataTypes.GEOMETRY' : DataTypes.GEOMETRY;
  } else if (_attr.match(/^array/)) {
    //TODO array 类型暂时定义为为 DataTypes.ARRAY(DataTypes.STRING)
    type = isStr ? 'DataTypes.ARRAY(DataTypes.STRING)' : DataTypes.ARRAY(DataTypes.STRING);
  } else if (_attr.match(/^varbinary/)) {
    type = isStr ? 'DataTypes.STRING.BINARY' : DataTypes.STRING.BINARY;
  } else {
    type = isStr ? `"${attrValue}"` : attrValue;
    throw new Error('无法识别类型' + _attr)
  }
  return type
}

function isReferences(obj) {
  return Object.prototype.hasOwnProperty.call(obj, 'references') &&
    Object.prototype.hasOwnProperty.call(obj.references, 'model') &&
    Object.prototype.hasOwnProperty.call(obj.references, 'key');
}

/**
 * 判断是否是多对多关系的中间表
 * // TODO 判断方式待优化
 * @param model
 * @returns {boolean}
 */
function isMiddleTable(model) {
  const rawAttributeKeys = Object.keys(model.rawAttributes);
  const referencesFields = rawAttributeKeys.filter(key => isReferences(model.rawAttributes[key]));
  const referencesModels = referencesFields.map(key => model.rawAttributes[key].references.model);
  //通过判断引用模型不少于2个
  return [...new Set(referencesModels)].length >= 2
}

/**
 * 自动绑定关联关系
 * @param models
 */
function autoBindAssociate(models) {
  Object.keys(models).forEach((modelName) => {
    const currentModel = models[modelName];
    if (currentModel.associate && typeof currentModel.associate === 'function') {
      const result = currentModel.associate(models);
      //此处判断如果模型的关系方法返回true，则不进行自动关联
      if (result === true) return
    }
    const referencesFields = Object.keys(currentModel.rawAttributes).filter(key => isReferences(currentModel.rawAttributes[key]));
    if (isMiddleTable(currentModel)) {
      referencesFields.forEach(key => {
        const referencedTable = models[currentModel.rawAttributes[key].references.model];
        referencesFields.forEach(field => {
          const target = models[currentModel.rawAttributes[field].references.model];
          if (key === field || referencedTable === target) return;
          referencedTable.belongsToMany(target, {through: currentModel});
          console.log(referencedTable.name + " belongsToMany " + target.name + " through " + currentModel.name);
        })
      })
    } else {
      referencesFields.forEach(key => {
        const attribute = currentModel.rawAttributes[key];
        const referencedTable = models[attribute.references.model];
        // TODO 由于不能判断一对一和一对多关系的区别，所有都断定为一对多
        currentModel.belongsTo(referencedTable, {foreignKey: key});
        referencedTable.hasMany(currentModel, {foreignKey: key});
        console.log(referencedTable.name + " hasMany " + currentModel.name + " with key " + key);
        console.log(currentModel.name + " belongsTo " + referencedTable.name + " with key " + key);
      })
    }
  });
}

module.exports.mapType = mapType;
module.exports.autoBindAssociate = autoBindAssociate;
module.exports.isMiddleTable = isMiddleTable;
module.exports.isReferences = isReferences;