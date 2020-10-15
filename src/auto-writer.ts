import fs from "fs";
import _ from "lodash";
import path from "path";
import util from "util";
import { AutoOptions, CaseOption, qNameSplit, recase } from "./types";
const mkdirp = require('mkdirp');

export class AutoWriter {
  tableText: { [name: string]: string };
  options: {
    caseFile: CaseOption;
    caseModel: CaseOption;
    directory: string;
    typescript: boolean;
    noWrite: boolean;
  };
  constructor(tableText: { [name: string]: string }, options: AutoOptions) {
    this.tableText = tableText;
    this.options = options;
  }

  write() {

    if (this.options.noWrite) {
      return Promise.resolve();
    }

    mkdirp.sync(path.resolve(this.options.directory));

    // write the individual model files
    const tables = _.keys(this.tableText);
    const promises = tables.map(t => {
      return this.createFile(t);
    });

    // write the init-models file
    const ists = this.options.typescript;
    const initString = ists ? this.createTsInitString(tables) : this.createES5InitString(tables);
    const initFilePath = path.join(this.options.directory, "init-models" + (ists ? '.ts' : '.js'));
    const writeFile = util.promisify(fs.writeFile);
    const initPromise = writeFile(path.resolve(initFilePath), initString);
    promises.push(initPromise);

    return Promise.all(promises);

    // Write out some Typescript d.ts files
    // if (this.options.typescript) {
    //   if (typescriptFiles !== null && typescriptFiles.length > 1) {
    //     fs.writeFileSync(path.join(self.options.directory, 'db.d.ts'), typescriptFiles[0], 'utf8');
    //     fs.writeFileSync(path.join(self.options.directory, 'db.tables.ts'), typescriptFiles[1], 'utf8');
    //   }
    // }
  }

  private createFile(table: string) {
    // FIXME: schema is not used to write the file name and there could be collisions. For now it
    // is up to the developer to pick the right schema, and potentially chose different output
    // folders for each different schema.
    const [schemaName, tableName] = qNameSplit(table);
    const fileName = recase(this.options.caseFile, tableName);
    const filePath = path.join(this.options.directory, fileName + (this.options.typescript ? '.ts' : '.js'));

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
      str += `  ${m} = _${m}(sequelize, DataTypes);\n`;
    });

    // return the models
    str += "\n  return {\n";
    modelNames.forEach(m => {
      str += `    ${m},\n`;
    });
    str += '  };\n';
    str += '}\n';
    str += 'module.exports = { initModels };\n';
    return str;
  }

}
