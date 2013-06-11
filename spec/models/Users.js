/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Users', { 
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    touchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: '2013-06-11 16:33:59.486843+00'
    },
    aNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    bNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    validateTest: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    validateCustom: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null
    },
    dateAllowNullTrue: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null
    }
  });
};
