import _ from "lodash";
import { QueryInterface, QueryTypes, Sequelize } from "sequelize";
import { DialectOptions, FKRow, FKSpec } from "./dialects/dialect-options";
import { dialects } from "./dialects/dialects";
import { DialectName, Table, TableData } from "./types";

export class AutoBuilder {
  sequelize: Sequelize;
  queryInterface: QueryInterface;
  dialect: DialectOptions;
  includeTables: string[];
  skipTables: string[];
  schema: string;
  tableData: TableData;

  constructor(sequelize: Sequelize, tables: string[], skipTables: string[], schema: string) {
    this.sequelize = sequelize;
    this.queryInterface = this.sequelize.getQueryInterface();
    this.dialect = dialects[this.sequelize.getDialect() as DialectName];
    this.includeTables = tables;
    this.skipTables = skipTables;
    this.schema = schema;
    this.tableData = new TableData();
  }

  build(): Promise<TableData> {

    if (this.dialect.showTablesQuery) {
      const showTablesSql = this.dialect.showTablesQuery(this.schema);
      return this.sequelize.query(showTablesSql, {
        raw: true,
        type: QueryTypes.SELECT
      }).then(tr => this.processTables(tr))
      .catch(err => { console.error(err); return this.tableData;});
    } else {
      return this.queryInterface.showAllTables().then(tr => this.processTables(tr))
      .catch(err => { console.error(err); return this.tableData;});
    }

  }

  private processTables(tableResult: any[]) {
    // tables is an array of either three things:
    // * objects with two properties table_name and table_schema
    // * objects with two properties tableName and tableSchema
    // * objects with a single name property
    // The first happens for dialects which support schemas (e.g. mssql, postgres).
    // The second happens for dialects which do not support schemas (e.g. sqlite).

    let tables = _.map(tableResult, t => {
      return {
        table_name: t.table_name || t.tableName || t.name || String(t),
        table_schema: t.table_schema || t.tableSchema || t.schema || this.schema || null
      } as Table;
    });

    // include/exclude tables
    if (this.includeTables) {
      const optables = mapOptionTables(this.includeTables, this.schema);
      tables = _.intersectionWith(tables, optables, isTableEqual);
    } else if (this.skipTables) {
      const skipTables = mapOptionTables(this.skipTables, this.schema);
      tables = _.differenceWith(tables, skipTables, isTableEqual);
    }

    const promises = tables.map(t => {
      return this.mapForeignKeys(t).then(() => this.mapTable(t));
    });

    return Promise.all(promises).then(() => this.tableData);
  }

  private mapForeignKeys(table: Table) {

    const tableQname = makeTableQName(table)
    const sql = this.dialect.getForeignKeysQuery(table.table_name, table.table_schema || this.sequelize.config.database);
    const dialect = this.dialect;
    const foreignKeys = this.tableData.foreignKeys;

    return this.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      raw: true
    }).then(res => {
      (res as FKRow[]).forEach(assignColumnDetails);
    }).catch(err => console.error(err));

    function assignColumnDetails(row: FKRow, ix: number, rows: FKRow[]) {
      let ref: FKSpec;
      if (dialect.remapForeignKeysRow) {
        ref = dialect.remapForeignKeysRow(table.table_name, row) as FKSpec;
      } else {
        ref = row as any as FKSpec;
      }

      if (!_.isEmpty(_.trim(ref.source_column)) && !_.isEmpty(_.trim(ref.target_column))) {
        ref.isForeignKey = true;
        ref.foreignSources = _.pick(ref, ['source_table', 'source_schema', 'target_schema', 'target_table', 'source_column', 'target_column']);
      }
      if (dialect.isUnique && dialect.isUnique(ref as any as FKRow, rows)) {
        ref.isUnique = ref.constraint_name || true;
      }
      if (_.isFunction(dialect.isPrimaryKey) && dialect.isPrimaryKey(ref)) {
        ref.isPrimaryKey = true;
      }
      if (dialect.isSerialKey && dialect.isSerialKey(ref)) {
        ref.isSerialKey = true;
      }
      foreignKeys[tableQname] = foreignKeys[tableQname] || {};
      foreignKeys[tableQname][ref.source_column] = _.assign({}, foreignKeys[tableQname][ref.source_column], ref);
    }
  }

  private mapTable(table: Table) {
    return this.queryInterface.describeTable(table.table_name, table.table_schema).then(fields => {
      this.tableData.tables[makeTableQName(table)] = fields;

      const countTriggerSql = this.dialect.countTriggerQuery(table.table_name, table.table_schema || "");
      return this.sequelize.query(countTriggerSql, {
        raw: true,
        type: QueryTypes.SELECT,
      }).then((triggerResult: any) => {
        const triggerCount = parseInt(triggerResult && triggerResult[0] && triggerResult[0].trigger_count)
        if (triggerCount > 0) {
          this.tableData.hasTriggerTables[makeTableQName(table)] = true;
        }
      });
    }).catch(err => console.error(err));
  }

}

// option tables are a list of strings; each string is either
// table name (e.g. "Customer") or schema dot table name (e.g. "dbo.Customer")
function mapOptionTables(arr: string[], defaultSchema: string): Table[] {
  return _.map(arr, (t: string) => {
    const sp = t.split('.');
    return {
      table_name: sp[sp.length - 1],
      table_schema: sp.length > 1 ? sp[sp.length - 2] : defaultSchema
    };
  });
}

function isTableEqual(a: Table, b: Table) {
  return a.table_name === b.table_name && (b.table_schema === null || a.table_schema === b.table_schema);
};

function makeTableQName(table: Table) {
  return [table.table_schema, table.table_name].filter(Boolean).join(".");
}


