import fs from "fs";
import _ from "lodash";
import path from "path";
import util from "util";
import { FKSpec, TableData } from ".";
import { AutoOptions, CaseOption, LangOption, qNameSplit, recase } from "./types";
const mkdirp = require('mkdirp');

export class AutoWriter {
  tableText: { [name: string]: string };
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } };
  options: {
    caseFile?: CaseOption;
    caseModel?: CaseOption;
    caseProp?: CaseOption;
    directory: string;
    lang?: LangOption;
    noWrite?: boolean;
  };
  constructor(tableData: TableData, options: AutoOptions) {
    this.tableText = tableData.text as  { [name: string]: string };
    this.foreignKeys = tableData.foreignKeys;
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

    const assoc = this.createAssociations();

    // get table names without schema
    // TODO: add schema to model and file names when schema is non-default for the dialect
    const tableNames = tables.map(t => {
      const [schemaName, tableName] = qNameSplit(t);
      return tableName as string;
    }).sort();

    // write the init-models file
    const ists = this.options.lang === 'ts';
    const initString = ists ? this.createTsInitString(tableNames, assoc) : this.createES5InitString(tableNames, assoc);
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

  /** Create the belongsTo/hasMany/hasOne association strings */
  private createAssociations() {
    let str = "";
    const fkTables = _.keys(this.foreignKeys).sort();
    fkTables.forEach(t => {
      const [schemaName, tableName] = qNameSplit(t);
      const modelName = recase(this.options.caseModel, tableName);
      const fkFields = this.foreignKeys[t];
      const fkFieldNames = _.keys(fkFields);
      fkFieldNames.forEach(fkFieldName => {
        const spec = fkFields[fkFieldName];
        if (spec.isForeignKey) {
          const targetModel = recase(this.options.caseModel, spec.foreignSources.target_table as string);
          const sourceProp = recase(this.options.caseProp, fkFieldName);
          str += `  ${modelName}.belongsTo(${targetModel}, { foreignKey: "${sourceProp}"});\n`;

          if (spec.isPrimaryKey) {
            // if FK is also part of the PK, see if there is a "many-to-many" junction
            const otherKey = _.find(fkFields, k => k.isForeignKey && k.isPrimaryKey && k.source_column !== fkFieldName);
            if (otherKey) {
              const otherModel = recase(this.options.caseModel, otherKey.foreignSources.target_table as string);
              const otherProp = recase(this.options.caseProp, otherKey.source_column);
              str += `  ${otherModel}.belongsToMany(${targetModel}, { through: ${modelName}, foreignKey: "${otherProp}", otherKey: "${sourceProp}" });\n`;
            }
          }

          // use "hasOne" cardinality if this FK is also a single-column Primary or Unique key; else "hasMany"
          const isOne = ((spec.isPrimaryKey && !_.some(fkFields, f => f.isPrimaryKey && f.source_column !== fkFieldName) ||
            (spec.isUnique && !_.some(fkFields, f => f.isUnique === spec.isUnique && f.source_column !== fkFieldName))));
          const hasRel = isOne ? "hasOne" : "hasMany";
          str += `  ${targetModel}.${hasRel}(${modelName}, { foreignKey: "${sourceProp}"});\n`;
        }
      });
    });
    return str;
  }

  // create the TypeScript init-models file to load all the models into Sequelize
  private createTsInitString(tables: string[], assoc: string) {
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

    // add the asociations
    str += "\n" + assoc;

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
  private createES5InitString(tables: string[], assoc: string) {
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

    // add the asociations
    str += "\n" + assoc;

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
