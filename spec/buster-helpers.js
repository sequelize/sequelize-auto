// https://raw.github.com/sequelize/sequelize/master/spec/buster-helpers.js
var Sequelize = require('sequelize')
    , config    = require(__dirname + "/config")
    , DataTypes = require(__dirname + '/../node_modules/sequelize/lib/data-types')
    , fs        = require('fs')
    , buster    = require("buster")

module.exports = {
  Sequelize: Sequelize,

  initTests: function(options) {
    var sequelize = this.createSequelizeInstance(options)

    this.clearDatabase(sequelize, function() {
      if (options.context) {
        options.context.sequelize = sequelize
      }

      if (options.beforeComplete) {
        options.beforeComplete(sequelize, DataTypes)
      }

      if (options.onComplete) {
        options.onComplete(sequelize, DataTypes)
      }
    })
  },

  createSequelizeInstance: function(options) {
    options = options || {}

    options.dialect = options.dialect || 'mysql'
    options.logging = (options.hasOwnProperty('logging') ? options.logging : false)

    var sequelizeOptions = {
      logging: options.logging,
      dialect: options.dialect,
      port:    config[options.dialect].port
    }

    if (process.env.DIALECT === 'postgres-native') {
      sequelizeOptions.native = true
    }

    return new Sequelize(
      config[options.dialect].database,
      config[options.dialect].username,
      config[options.dialect].password,
      sequelizeOptions
    )
  },

  clearDatabase: function(sequelize, callback) {
    sequelize
      .getQueryInterface()
      .dropAllTables()
      .success(function() {
        sequelize.daoFactoryManager.daos = []
        fs.readdir(config.directory, function(err, files){
          if (!files || files.length < 1)
            return callback && callback()
          files.forEach(function(file){
            var stat = fs.statSync(config.directory + '/' + file);
            if (stat.isFile())
              fs.unlinkSync(config.directory + '/' + file);
          });
          callback && callback()
        });
      })
      .error(function(err) { console.log(err) })
  },

  getSupportedDialects: function() {
    return fs.readdirSync(__dirname + '/../node_modules/sequelize/lib/dialects').filter(function(file) {
      return ((file.indexOf('.js') === -1) && (file.indexOf('abstract') === -1))
    })
  },

  getTestDialect: function() {
    var envDialect = process.env.DIALECT || 'mysql'

    if (envDialect === 'postgres-native') {
      envDialect = 'postgres'
    }

    if (this.getSupportedDialects().indexOf(envDialect) === -1) {
      throw new Error('The dialect you have passed is unknown. Did you really mean: ' + envDialect)
    }

    return envDialect
  },

  getTestDialectTeaser: function(moduleName) {
    var dialect = this.getTestDialect()

    if (process.env.DIALECT === 'postgres-native') {
      dialect = 'postgres-native'
    }

    return "[" + dialect.toUpperCase() + "] " + moduleName
  },

  checkMatchForDialects: function(dialect, value, expectations) {
    if (!!expectations[dialect]) {
      expect(value).toMatch(expectations[dialect])
    } else {
      throw new Error('Undefined expectation for "' + dialect + '"!')
    }
  },

  assertException: function(block, msg) {
    try {
      block()
      throw new Error('Passed function did not throw an error')
    } catch(e) {
      buster.assert.equals(e.message, msg)
    }
  }
}
