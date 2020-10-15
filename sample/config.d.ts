
export type Dialect = 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';

export interface Options {
  dialect: Dialect;
  storage?: any;
}

export interface AutoOptions extends Options {
  directory: any;
  caseFile: string;
  caseModel: string;
  caseProp: string;
  typescript: boolean;
  spaces: boolean;
  indentation: number;
}

export interface Config {
  dbname: string;
  user: string;
  pass: string;
  options: Options;
  autoOptions: AutoOptions;
}

declare const config: Config;
export default config;

// declare module "config" {
//     export = config;
// }