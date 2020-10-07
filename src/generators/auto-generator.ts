import { DialectOptions } from "../dialects/dialect-options";
import { AutoOptions, CaseOption, TableData } from "../types";

export default abstract class AutoGenerator {
  dialect: DialectOptions;
  tables: { [name: string]: any };
  foreignKeys: { [name: string]: any };
  hasTriggerTables: { [name: string]: boolean };
  options: {
    indentation: number;
    spaces: boolean;
    typescript: boolean;
    es6: boolean;
    esm: boolean;
    caseModel: CaseOption;
    caseProp: CaseOption;
    additional: any;
    schema: string;
  }
  tabValue: string;

  constructor(tableData: TableData, dialect: DialectOptions, options: AutoOptions) {
    this.tables = tableData.tables;
    this.foreignKeys = tableData.foreignKeys;
    this.hasTriggerTables = tableData.hasTriggerTables;
    this.dialect = dialect;
    this.options = options;

    this.tabValue = '';
    for (let x = 0; x < this.options.indentation; ++x) {
      this.tabValue += (this.options.spaces === true ? ' ' : "\t");
    }
  }

  public abstract generateText() : any;

  protected getPropertyName(table: string, field: string) : string | undefined {
    let fieldObj = this.tables[table][field];
    let propertyName = fieldObj['propertyName'];
    if(propertyName) {
      return propertyName;
    }
    return undefined;
  }

  protected getPropertyNameOrField(table: string, field: string) : string {
    let propertyName = this.getPropertyName(table, field);
    if(propertyName) {
      return propertyName;
    }
    return field;
  }

  protected tabify(count: number, line: string) : string {
    let str: string = "";

    for(let ca = 0; ca < count; ca++) {
      str += this.tabValue;
    }
    return str + line;
  }
}