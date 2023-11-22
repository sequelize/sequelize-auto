import { mssqlOptions } from './mssql';
import { mysqlOptions } from './mysql';
import { postgresOptions } from './postgres';
import { sqliteOptions } from './sqlite';
import { DialectOptions } from './dialect-options';
import { Dialect } from 'sequelize';
import { NotImplementedOptions } from './not-implemented';

export const dialects: { [name in Dialect]: DialectOptions } = {
  mssql: mssqlOptions,
  mysql: mysqlOptions,
  mariadb: mysqlOptions,
  postgres: postgresOptions,
  sqlite: sqliteOptions,
  db2: NotImplementedOptions,
  snowflake: NotImplementedOptions,
  oracle: NotImplementedOptions
};
