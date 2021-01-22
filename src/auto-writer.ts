import fs from "fs";
import _ from "lodash";
import path from "path";
import util from "util";
import { FKSpec, TableData } from ".";
import { AutoOptions, CaseOption, LangOption, qNameSplit, recase, Relation } from "./types";
const mkdirp = require('mkdirp');

/** Writes text into files from TableData.text, and writes init-models */
export class AutoWriter {
  tableText: { [name: string]: string };
  foreignKeys: { [tableName: string]: { [fieldName: string]: FKSpec } };
  relations: Relation[];
  options: {
    caseFile?: CaseOption;
    caseModel?: CaseOption;
    caseProp?: CaseOption;
    directory: string;
    lang?: LangOption;
    noWrite?: boolean;
    singularize?: boolean;
  };
  constructor(tableData: TableData, options: AutoOptions) {
    this.tableText = tableData.text as { [name: string]: string };
    this.foreignKeys = tableData.foreignKeys;
    this.relations = tableData.relations;
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

    const ists = this.options.lang === 'ts';
    const assoc = this.createAssociations(ists);

    // get table names without schema
    // TODO: add schema to model and file names when schema is non-default for the dialect
    const tableNames = tables.map(t => {
      const [schemaName, tableName] = qNameSplit(t);
      return tableName as string;
    }).sort();

    // write the init-models file
    const initString = this.createInitString(tableNames, assoc, this.options.lang);
    const initFilePath = path.join(this.options.directory, "init-models" + (ists ? '.ts' : '.js'));
    const writeFile = util.promisify(fs.writeFile);
    const initPromise = writeFile(path.resolve(initFilePath), initString);
    promises.push(initPromise);

    return Promise.all(promises);
  }
  private createInitString(tableNames: string[], assoc: string, lang?: string) {
    switch (lang) {
      case 'ts':
        return this.createTsInitString(tableNames, assoc);
      case 'esm':
        return this.createESMInitString(tableNames, assoc);
      default:
        return this.createES5InitString(tableNames, assoc);
    }
  }
  private createFile(table: string) {
    // FIXME: schema is not used to write the file name and there could be collisions. For now it
    // is up to the developer to pick the right schema, and potentially chose different output
    // folders for each different schema.
    const [schemaName, tableName] = qNameSplit(table);
    const fileName = recase(this.options.caseFile, tableName, this.options.singularize);
    const filePath = path.join(this.options.directory, fileName + (this.options.lang === 'ts' ? '.ts' : '.js'));

    const writeFile = util.promisify(fs.writeFile);
    return writeFile(path.resolve(filePath), this.tableText[table]);
  }

  /** Create the belongsToMany/belongsTo/hasMany/hasOne association strings */
  private createAssociations(typeScript: boolean) {
    let strBelongs = "";
    let strBelongsToMany = "";
    // declare through model "as Model" because typings don't match
    const asAny = typeScript ? " as typeof Model" : "";

    const rels = this.relations;
    rels.forEach(rel => {
      if (rel.isM2M) {
        strBelongsToMany += `  ${rel.parentModel}.belongsToMany(${rel.childModel}, { through: ${rel.joinModel}${asAny}, foreignKey: "${rel.parentId}", otherKey: "${rel.childId}" });\n`;
      } else {
        strBelongs += `  ${rel.childModel}.belongsTo(${rel.parentModel}, { as: "${rel.parentProp}", foreignKey: "${rel.parentId}"});\n`;
        const hasRel = rel.isOne ? "hasOne" : "hasMany";
        strBelongs += `  ${rel.parentModel}.${hasRel}(${rel.childModel}, { as: "${rel.childProp}", foreignKey: "${rel.parentId}"});\n`;
      }
    });

    // belongsToMany must come first
    return strBelongsToMany + strBelongs;
  }

  // create the TypeScript init-models file to load all the models into Sequelize
  private createTsInitString(tables: string[], assoc: string) {
    let str = 'import type { Sequelize, Model } from "sequelize";\n';
    const modelNames: string[] = [];
    // import statements
    tables.forEach(t => {
      const fileName = recase(this.options.caseFile, t, this.options.singularize);
      const modelName = recase(this.options.caseModel, t, this.options.singularize);
      modelNames.push(modelName);
      str += `import { ${modelName} } from "./${fileName}";\n`;
      str += `import type { ${modelName}Attributes, ${modelName}CreationAttributes } from "./${fileName}";\n`;
    });
    // re-export the model classes
    str += '\nexport {\n';
    modelNames.forEach(m => {
      str += `  ${m},\n`;
    });
    str += '};\n';
    // re-export the model attirbutes
    str += '\nexport type {\n';
    modelNames.forEach(m => {
      str += `  ${m}Attributes,\n`;
      str += `  ${m}CreationAttributes,\n`;
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
      str += `    ${m}: ${m},\n`;
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
      const fileName = recase(this.options.caseFile, t, this.options.singularize);
      const modelName = recase(this.options.caseModel, t, this.options.singularize);
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

  // create the ESM init-models file to load all the models into Sequelize
  private createESMInitString(tables: string[], assoc: string) {
    let str = 'import _sequelize from "sequelize";\n';
    str += 'const DataTypes = _sequelize.DataTypes;\n';
    const modelNames: string[] = [];
    // import statements
    tables.forEach(t => {
      const fileName = recase(this.options.caseFile, t, this.options.singularize);
      const modelName = recase(this.options.caseModel, t, this.options.singularize);
      modelNames.push(modelName);
      str += `import _${modelName} from  "./${fileName}.js";\n`;
    });

    // create the initialization function
    str += '\nexport default function initModels(sequelize) {\n';
    modelNames.forEach(m => {
      str += `  var ${m} = _${m}.init(sequelize, DataTypes);\n`;
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
}
