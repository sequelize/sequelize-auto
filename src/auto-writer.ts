import fs from "fs";
import _ from "lodash";
import path from "path";
import util from "util";
import { AutoOptions, CaseOption, LangOption, qNameSplit, recase } from "./types";
const mkdirp = require('mkdirp');

export class AutoWriter {
  tableText: { [name: string]: string };
  options: {
    caseFile?: CaseOption;
    caseModel?: CaseOption;
    directory: string;
    lang?: LangOption;
    noWrite?: boolean;
  };
  constructor(tableText: { [name: string]: string }, options: AutoOptions) {
    this.tableText = tableText;
    this.options = options;
  }

  write() {

    if (this.options.noWrite) {
      return Promise.resolve();
    }

    mkdirp.sync(path.resolve(this.options.directory || "./models"));

    const tables = _.keys(this.tableText);

    // write the individual model files
    const promises = tables.map(t => {
      return this.createFile(t);
    });

    // get table names without schema
    // TODO: add schema to model and file names when schema is non-default for the dialect
    const tableNames = tables.map(t => {
      const [schemaName, tableName] = qNameSplit(t);
      return tableName as string;
    });

    // write the init-models file
    const ists = this.options.lang === 'ts';
    const initString = ists ? this.createTsInitString(tableNames) : this.createES5InitString(tableNames);
    const initFilePath = path.join(this.options.directory, "init-models" + (ists ? '.ts' : '.js'));
    const writeFile = util.promisify(fs.writeFile);
    const initPromise = writeFile(path.resolve(initFilePath), initString);
    promises.push(initPromise);

    return Promise.all(promises);
  }

  private createFile(table: string) {
    // FIXME: schema is not used to write the file name and there could be collisions. For now it
    // is up to the developer to pick the right schema, and potentially chose different output
    // folders for each different schema.
    const [schemaName, tableName] = qNameSplit(table);
    const fileName = recase(this.options.caseFile, tableName);
    const filePath = path.join(this.options.directory, fileName + (this.options.lang === 'ts' ? '.ts' : '.js'));

    const writeFile = util.promisify(fs.writeFile);
    return writeFile(path.resolve(filePath), this.tableText[table]);
  }

  // create the TypeScript init-models file to load all the models into Sequelize
  private createTsInitString(tables: string[]) {
    let str = 'import { Sequelize } from "sequelize";\n';
    const modelNames: string[] = [];
    // import statements
    tables.forEach(t => {
      const fileName = recase(this.options.caseFile, t);
      const modelName = recase(this.options.caseModel, t);
      modelNames.push(modelName);
      str += `import { ${modelName}, ${modelName}Attributes } from "./${fileName}";\n`;
    });
    // re-export the model classes
    str += '\nexport {\n';
    modelNames.forEach(m => {
      str += `  ${m}, ${m}Attributes,\n`;
    });
    str += '};\n\n';

    // create the initialization function
    str += 'export function initModels(sequelize: Sequelize) {\n';
    modelNames.forEach(m => {
      str += `  ${m}.initModel(sequelize);\n`;
    });

    // return the models
    str += "\n  return {\n";
    modelNames.forEach(m => {
      str += `    ${m},\n`;
    });
    str += '  };\n';
    str += '}\n';

    return str;
  }

  // create the ES5 init-models file to load all the models into Sequelize
  private createES5InitString(tables: string[]) {
    let str = 'var DataTypes = require("sequelize").DataTypes;\n';
    const modelNames: string[] = [];
    // import statements
    tables.forEach(t => {
      const fileName = recase(this.options.caseFile, t);
      const modelName = recase(this.options.caseModel, t);
      modelNames.push(modelName);
      str += `var _${modelName} = require("./${fileName}");\n`;
    });

    // create the initialization function
    str += '\nfunction initModels(sequelize) {\n';
    modelNames.forEach(m => {
      str += `  var ${m} = _${m}(sequelize, DataTypes);\n`;
    });

    // return the models
    str += "\n  return {\n";
    modelNames.forEach(m => {
      str += `    ${m},\n`;
    });
    str += '  };\n';
    str += '}\n';
    str += 'module.exports = initModels;\n';
    str += 'module.exports.initModels = initModels;\n';
    str += 'module.exports.default = initModels;\n';
    return str;
  }

}
