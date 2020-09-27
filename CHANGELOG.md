# sequelize-auto change log

## [0.6.2]

* Fix #TABLE# placeholder left in ES6 output, issue #432 (thanks @fprijate)
* Fix command line `config` arguments, issue #434 (thanks @fprijate)
* Fix schema comparison when filtering tables, issue #431

## [0.6.1] - 2020-09-21

* Fix default values for Postres Array types, issue #426
* Fix multi-field unique constraints, issue #347 and #408
* Fix tableResult properties, PR #429
* Fix quotes in datatype names, issue #100
* Catch promise rejections in auto-builder

## [0.6.0] - 2020-09-17

* **BREAKING CHANGE**  Change API to Promises instead of callbacks
* Rewrite source code in TypeScript, add build step
* Fix default value for Postgres JSON types, issue #426
* Omit sysdiagrams from mssql tables
* Update dependencies

## [0.5.4] - 2020-08-27

* Fix handling case sensitive collation in MSSQL, issue #416 (thanks @karpikpl)
* Fix missing autoIncrement attribute due to schema clash, issue #419 (thanks @marcelopc)
* **BREAKING CHANGE** Separate options for controlling case of output objects: `caseModel`, `caseFile`, `caseProp`, issue #413 
* Remove eslint from model generation, move into generate test, issue #425
* Remove test files from npm package, using "files" option instead of .npmignore, issue #418

## [0.5.3] - 2020-07-21

* Fix filtering by `tables`|`skipTables` broken in 0.5.1, issue #409
* Improve validation of command-line arguments `-c`,`-a`, issue #146 #213 #241
* Fix travis build

## [0.5.2] - 2020-07-16

* Fix quotes in comments, #190
* Fix defaultValue for boolean and number types, #225 and #386
* Fix default value for CURRENT_TIMESTAMP and mssql functions
* Fix unique attribute, #169
* Fix autoIncrement for sqlite, #209

## [0.5.1] - 2020-07-10

* Fix `export default` in esm output (thanks @vykuntaharsha)
* Fix missing comma after `autoIncrement`
* Don't output `comment` if empty
* Add `hasTrigger` support #217 (thanks @joaoe)
* Fix check constraints when gathering foreign key info for mssql (thanks @joaoe)
* Fix mysql views generation #354 (thanks @joaoe)
* Fix schema support, #348 #350 (thanks @joaoe and @dlredden) 
* Add tests for cross-schema foreign keys (thanks @dlredden)
* Add tests for snake_case table names -> UpperCamelCase model names

## [0.5.0] - 2020-07-03

* Add UpperCamelCase option (thanks @marshalys)
* Document existing camelCase option (thanks @murfett-au)
* Fix postgres dialect foreign key query to support Postgres 12
* Update compatibility to Sequelize v5 & v6 (thanks @createthis @mrbichel @naren7229)
* Fix "c.extra" in mysql foreign keys query (thanks @bkolla-ft and @jeongjuwon)
* Fix support for `double` type (thanks @wen911119)
* Add support for `closeConnectionAutomatically` (thanks @allnulled)
* Fix schema name join in mysql foreign keys query (thanks @yujunlong2000) 
* Add schema to generated files (thanks @THAlpha)
* Add arg "l", output language, values es5|es6|esm|ts  (thanks @threem0126)
* Add HSTORE data type (thanks @roytz)
* Fix tedious warnings for trustServerCertificate and enableArithAbort
* Fix support for mssql: nchar, nvarchar, money, varbinary types


## [0.4.29] - 2017-10-23

### Fixed

* Sets DATEONLY for DATE types
* Fix typescript, add missing option for camelcase filenames...
* Fixes JSONB support
* Fixes TIMESTAMP support

## [0.4.28] - 2017-04-22

### Fixed

* Fixes for timestamps fields
* Fixes current_time code error

## [0.4.27] - 2017-04-05

### Fixed

* Fixes schema support

## [0.4.26] - 2017-04-05

### Fixed

* The defaultValue is now escape'd
* Boolean/Bit columns are now fixed for MSSQL

### Added

* Adds schema support for `postgres` with the `s` flag.

## [0.4.25] - 2017-03-20

### Added

* Adds `unique` support for `postgres`, `mysql`, and `mariadb`.

### Fixed

* Fixes `foreign key` and `unique` columns.

## [0.4.24] - 2017-03-20

### Added

* Adds support for `UNSIGNED` and `ZEROFILL` MySQL columns.

## [0.4.23] - 2017-03-20

### Fixed

* Adds schema support for `postgres` databases.
* Directory output is now fixed for commands containing a config file as well.
* Default port number has been added for `postgres`.
* Mssql should now properly identify `auto increment` and `foreign key` columns.

## [0.4.22] - 2017-03-20

### Fixed

* Sqlite will now properly set the `storage` option to the `database` value if no `storage` option is set.
