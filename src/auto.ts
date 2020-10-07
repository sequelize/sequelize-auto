
import _ from "lodash";
import { Sequelize } from "sequelize";
import { AutoBuilder } from "./auto-builder";
import AutoGenerator from "./generators/auto-generator";
import { AutoWriter } from "./auto-writer";
import { dialects } from "./dialects/dialects";
import { JsAutoGenerator } from "./generators/js-auto-generator";
import { TypescriptAutoGenerator } from "./generators/typescript-auto-generator";
import { AutoOptions, DialectName, TableData, TableOverride, ColumnOverride } from "./types";

export class SequelizeAuto {
  sequelize: Sequelize;
  options: AutoOptions;

  constructor(database: string | Sequelize, username: string, password: string, options: AutoOptions) {
    if (options && options.dialect === 'sqlite' && !options.storage && database) {
      options.storage = database as string;
    }
    if (options && options.dialect === 'mssql') {
      // set defaults for tedious, to silence the warnings
      options.dialectOptions = options.dialectOptions || {};
      options.dialectOptions.options = options.dialectOptions.options || {};
      options.dialectOptions.options.trustServerCertificate = true;
      options.dialectOptions.options.enableArithAbort = true;
      options.dialectOptions.options.validateBulkLoadParameters = true;
    }

    if (database instanceof Sequelize) {
      this.sequelize = database;
    } else {
      this.sequelize = new Sequelize(database, username, password, options || {});
    }


    this.options = _.extend({
      spaces: false,
      indentation: 1,
      directory: './models',
      additional: {},
      freezeTableName: true,
      typescript: false,
      closeConnectionAutomatically: true
    }, options || {});

  }

  async run() {
    const td = await this.build();
    await this.applyOverrides(td);
    const tt = this.generate(td);
    await this.write(tt);
    td.text = tt;
    return td;
  }

  build(): Promise<TableData> {
    const builder = new AutoBuilder(this.sequelize, this.options.tables, this.options.skipTables, this.options.schema);
    return builder.build().then(tableData => {
      if (this.options.closeConnectionAutomatically) {
        return this.sequelize.close().then(() => tableData);
      }
      return tableData;
    });
  }

  applyOverrides(td: TableData) {
    let tableNames = _.keys(this.options.tableOverrides);
    tableNames.forEach(tableName => {
      let tableOverride = this.options.tableOverrides[tableName];
      let table = td.tables[tableName];
      if(table === undefined) {
        console.warn(`Overridden table ${tableName} not found. Try adding the schema.`);
        return;
      }
      let columnNames = _.keys(tableOverride.columnOverrides);
      columnNames.forEach(columnName => {
        let columnOverride = tableOverride.columnOverrides[columnName];
        let column = table[columnName];
        if(column === undefined) {
          console.warn(`Overridden column ${tableName}.${columnName} not found.`);
          return;
        }

        if(columnOverride.propertyName) {
          column.propertyName = columnOverride.propertyName;
        }
      });
    });
  }

  generate(tableData: TableData) {
    const dialect = dialects[this.sequelize.getDialect() as DialectName];
    let generator : AutoGenerator;
    if(this.options.typescript) {
      generator = new TypescriptAutoGenerator(tableData, dialect, this.options);
    } else {
      generator = new JsAutoGenerator(tableData, dialect, this.options);
    }
    return generator.generateText();
  }

  write(tableText: { [name: string]: string }) {
    const writer = new AutoWriter(tableText, this.options);
    return writer.write();
  }
}

module.exports = SequelizeAuto;