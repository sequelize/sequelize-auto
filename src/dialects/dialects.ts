import { mssqlOptions } from "./mssql";
import { mysqlOptions } from "./mysql";
import { postgresOptions } from "./postgres";
import { sqliteOptions } from "./sqlite";
import { DialectOptions } from "./dialect-options";
import { DialectName } from "../types";

export const dialects: { [name in DialectName]: DialectOptions } = {
  mssql: mssqlOptions, 
  mysql: mysqlOptions,
  mariadb: mysqlOptions,
  postgres: postgresOptions,
  sqlite: sqliteOptions
};