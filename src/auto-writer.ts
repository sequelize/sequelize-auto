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

    const tables = _.keys(this.tableText);
    const promises = tables.map(t => {
      return this.createFile(t);
    });

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
}
