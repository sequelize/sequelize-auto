# sequelize-auto change log

## [0.8.2] - 2021-03-31

* TypeScript: fix imports when `esModuleInterop` is false (#498)
* mssql: Make varchar(max) be DataTypes.TEXT (#508)
* Fix name collision when plural and singular are the same (#509)
* Fix missing associations (#510 and #512)
* TypeScript: remove cast "as typeof Model" in belongsToMany, for compatibility with Sequelize 6.6.2 (#511)
* mysql: Treat `tinyint(1)` as boolean (#514)
* Update devDependencies

## [0.8.1] - 2021-03-09

* Allow password to be supplied from terminal (#503) (thanks @zypA13510)
* Fix autoIncrement for SQLite (#504)
* TypeScript: make field optional with "?" if it has a defaultValue (#505)
* BREAKING CHANGE: command-line options always take precedence over config file options
* BREAKING CHANGE: `tables` and `skipTables` options on command line are now space-separated (instead of comma-separated) lists
* BREAKING CHANGE: drop support of **node** version less than **10**

## [0.8.0] - 2021-02-25

* Add alias name to belongsToMany associations (#500)
* Fix `references` to remove `schema`, seems unnecessary (#501)
* Let host, database, username, and password be set via config file (#482) (thanks @twastvedt)
* Update dependencies

## [0.7.11] - 2021-02-09

* Fix precision & scale for mssql DECIMAL types
* Write mssql NUMERIC as DECIMAL instead of DOUBLE (#496)
* Fix ENUM datatype for mysql
* Sort relations by [parent, child] in init-models.ts
* Update README to show alias in associations

## [0.7.10] - 2021-02-03

* Fix explicit NULL default values in mssql (#491) (thanks @md-shah)
* Fix relation alias uniqueness (#489)
* Add handling for Postgres range types (#490)
* Make `id` field primaryKey if no other primaryKey exists (#480)

## [0.7.9] - 2021-01-29

* Fix schema handling and case errors in relations
* Fix generation of relationships for mysql (#488)
* Fix CRLF line breaks in bin/sequelize-auto (#487, #475, #462)

## [0.7.8] - 2021-01-23

* Make information_schema queries uppercase for mssql (#486)
* Move meta queries from dialect-options to dialect-specific files
* Create relations based on properties and alias instead of model names (#483, #466)

## [0.7.7] - 2021-01-16

* Escape special characters in default value (#476) (thanks @divinebovine)
* Quote strings in Postgres array default values (#474)
* Support both Postgres and Mysql enums (#479) (thanks @JonathanWolfe)
* Use `autoIncrementIdentity` for Postgres identity columns (#485) (thanks @AdamAld)

## [0.7.6] - 2020-12-17

* Fix postgres array of enum (#463)
* Fix `init-models` for ES6 modules (#464) (thanks @djake)
* Fix examples in README (#465) (thanks @brandomeniconi)
* Fix bug parsing comments as field type (#471)
* TypeScript - add missing create/remove/has association methods (#467) (thanks @mat813)
* TypeScript - don't lowercase the enum values (#468) (thanks @JonathanWolfe)
* TypeScript - get/set DATE and TIME types as `string` instead of `date` (#469) (thanks @JonathanWolfe)

## [0.7.5] - 2020-12-05

* Add `--singularize` option, to singularize model and file names from plural table names
* TypeScript - add association `get/set/add/remove/has/count/create` mixing methods to TypeScript models (#453) (thanks @mat813)
* TypeScript - Add TableId and TablePk to model definitions (#453) (thanks @mat813)
* Fix autoIncrement for generated keys in Postgres (#459 and #460) (thanks @divinebovine) 
* Cast through class to `Model` instead of `any` (#454) (thanks @mat813)
* Fix postgres enum types broken in 0.7.2 (#455)

## [0.7.4] - 2020-12-01

* TypeScript - only declare properties optional (with `?`) when field is nullable (#450) (thanks @mat813)
* TypeScript - add the ModelCreationAttributes to the generated files (#451) (thanks @mat813)
* TypeScript - add not-null assertions (with `!`) for fields
* Put `belongsToMany` relationships first in init-models (#449)
* Set `noWrite` = true when directory == false (#447)

## [0.7.3] - 2020-11-29

* Fix autoIncrement for non-key fields in Postgres (#446 and #448)
* Remove obsolete dependencies `async` and `graceful-fs-extra`

## [0.7.2] - 2020-11-19

* Add enum support for TypeScript types (#443) (thanks @JonathanWolfe)
* Make `init-modules` ts version compliant with `--isolatedModules` (#444) (thanks @JonathanWolfe).  This is a **BREAKING CHANGE** because `--lang ts` output now requires TypeScript >= 3.8
* Fix geometry/geography types in Postgres (#445)

## [0.7.1] - 2020-11-05

* Fix `foreignKey` property in `belongsTo` (#369)
* Add `belongsToMany` when junction has 2 foreign keys that are also primary keys (#34)

## [0.7.0] - 2020-11-03

* Add `belongsTo/hasOne/hasMany` to initModels (#34) (#61) (#65) (#82) (#215) (#369)
* Add precision to DECIMAL, DOUBLE, and FLOAT types
* Add element type to Postgres ARRAY data types and TypeScript definitions (#151) 

## [0.6.7] - 2020-11-01

* Fix "Assignment to constant" error introduced in 0.6.6 (#440) (thanks @xuezier)
* Add support for generating models from views, `--views` option (#77)

## [0.6.6] - 2020-10-30

* Add `indexes` to table options (#162)
* **BREAKING CHANGE** Change es6/esm/ts flags to `lang` option
* Add JSDoc commments to type declarations
* Add DataTypes.UUIDV4 default for postgres (#155) (thanks @roytz)

## [0.6.5] - 2020-10-26

* Escape special chars in table comments (#439)
* Map mysql longtext/mediumtext/tinytext to DataTypes.TEXT
* Export SequelizeAuto types in npm package (#140)

## [0.6.4] - 2020-10-15

* Export attributes interface for TypeScript files
* Generate `init-model.js` file for loading models into sequelize
* Add support for mysql date & time precision (thanks @locene)
* Infer timestamps flag based on presence of createdAt/updatedAt field in tables
* Change default indentation to 2 spaces
* Add sample app; see [sample](./sample) directory
* Fix quoting of table names in sqlite foreign keys query

## [0.6.3] - 2020-10-05

* Fix TypeScript generation (thanks @sschwenker)

## [0.6.2] - 2020-09-28

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
