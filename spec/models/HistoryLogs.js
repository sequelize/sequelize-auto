/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('HistoryLogs', { 
    someText: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    aNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    aRandomId: {
      type: DataTypes.INTEGER,
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
