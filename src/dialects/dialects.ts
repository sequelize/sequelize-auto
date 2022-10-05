import { mssqlOptions } from "./mssql";
import { mysqlOptions } from "./mysql";
import { postgresOptions } from "./postgres";
import { sqliteOptions } from "./sqlite";
import { baseOptions } from "./base";
import { DialectOptions } from "./dialect-options";
import { Dialect } from "sequelize";

export const dialects: { [name in Dialect]: DialectOptions } = {
  mssql: mssqlOptions,
  mysql: mysqlOptions,
  mariadb: mysqlOptions,
  postgres: postgresOptions,
  sqlite: sqliteOptions,
  db2: baseOptions,
  snowflake: baseOptions,
  oracle: baseOptions
};
