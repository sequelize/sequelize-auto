
import _ from "lodash";
import { AutoOptions } from ".";
import { FKSpec } from "./dialects/dialect-options";
import { CaseOption, qNameJoin, qNameSplit, recase, Relation, TableData, singularize, pluralize } from "./types";

/** Constructs entity relationships from TableData.foreignKeys and populates TableData.relations */
export class AutoRelater {
  caseModel: CaseOption;
  caseProp: CaseOption;
  singularize: boolean;
  relations: Relation[];
  private usedChildNames: Set<string>;

  constructor(options: AutoOptions) {
    this.caseModel = options.caseModel || 'o';
    this.caseProp = options.caseProp || 'o';
    this.singularize = options.singularize;

    this.relations = [];
    this.usedChildNames = new Set();
  }

  /** Create Relations from the foreign keys, and add to TableData */
  buildRelations(td: TableData) {

    const fkTables = _.keys(td.foreignKeys).sort();
    fkTables.forEach(t => {
      const fkFields = td.foreignKeys[t];
      const fkFieldNames = _.keys(fkFields);
      fkFieldNames.forEach(fkFieldName => {
        const spec = fkFields[fkFieldName];
        if (spec.isForeignKey) {
          this.addRelation(t, fkFieldName, spec, fkFields);
        }
      });
    });

    td.relations = _.sortBy(this.relations, ['parentTable', 'childTable']);
    return td;
  }

  /** Create a Relation object for the given foreign key */
  private addRelation(table: string, fkFieldName: string, spec: FKSpec, fkFields: { [fieldName: string]: FKSpec; }) {

    const [schemaName, tableName] = qNameSplit(table);
    const schema = schemaName as string;
    const modelName = recase(this.caseModel, tableName, this.singularize);

    const targetModel = recase(this.caseModel, spec.foreignSources.target_table as string, this.singularize);
    const alias = this.getAlias(fkFieldName, spec.foreignSources.target_table as string, spec.foreignSources.source_table as string);
    const childAlias = this.getChildAlias(fkFieldName, spec.foreignSources.source_table as string, spec.foreignSources.target_table as string);
    const sourceProp = recase(this.caseProp, fkFieldName);

    // use "hasOne" cardinality if this FK is also a single-column Primary or Unique key; else "hasMany"
    const isOne = ((spec.isPrimaryKey && !_.some(fkFields, f => f.isPrimaryKey && f.source_column !== fkFieldName) ||
      (!!spec.isUnique && !_.some(fkFields, f => f.isUnique === spec.isUnique && f.source_column !== fkFieldName))));

    this.relations.push({
      parentId: sourceProp,
      parentModel: targetModel,
      parentProp: alias,
      parentTable: qNameJoin(spec.foreignSources.target_schema || schema, spec.foreignSources.target_table),
      childModel: modelName,
      childProp: isOne ? singularize(childAlias) : pluralize(childAlias),
      childTable: qNameJoin(spec.foreignSources.source_schema || schema, spec.foreignSources.source_table),
      isOne: isOne,
      isM2M: false
    });

    if (spec.isPrimaryKey) {
      // if FK is also part of the PK, see if there is a "many-to-many" junction
      const otherKeys = _.filter(fkFields, k => k.isForeignKey && k.isPrimaryKey && k.source_column !== fkFieldName);
      if (otherKeys.length === 1) {
        const otherKey = otherKeys[0];
        const otherModel = recase(this.caseModel, otherKey.foreignSources.target_table as string, this.singularize);
        const otherProp = this.getAlias(otherKey.source_column, otherKey.foreignSources.target_table as string, otherKey.foreignSources.source_table as string, true);
        const otherId = recase(this.caseProp, otherKey.source_column);

        this.relations.push({
          parentId: sourceProp,
          parentModel: targetModel,
          parentProp: pluralize(alias),
          parentTable: qNameJoin(spec.foreignSources.target_schema || schema, spec.foreignSources.target_table),
          childModel: otherModel,
          childProp: pluralize(otherProp),
          childTable: qNameJoin(otherKey.foreignSources.target_schema || schema, otherKey.foreignSources.target_table),
          childId: otherId,
          joinModel: modelName,
          isOne: isOne,
          isM2M: true
        });
      }
    }
  }

  /** Convert foreign key name into alias name for belongsTo relations */
  private getAlias(fkFieldName: string, modelName: string, targetModel: string, isM2M = false) {
    let name = this.trimId(fkFieldName);
    if (name === fkFieldName || isM2M) {
      name = fkFieldName + "_" + modelName;
    }
    
    // singularize in case one column name is the singularized form of another column in the same model
    let singleName = singularize(name);
    if (isM2M) {
      if (this.usedChildNames.has(modelName + "." + singleName)) {
        name = name + "_" + targetModel;
      }
      this.usedChildNames.add(modelName + "." + singularize(name));
    }
    else {
      if (this.usedChildNames.has(targetModel + "." + singleName)){
        name = name + "_" + modelName;
      }
      this.usedChildNames.add(targetModel + "." + singularize(name));
    }
    return recase(this.caseProp, name, true);
  }

  /** Convert foreign key name into alias name for hasMany/hasOne relations */
  private getChildAlias(fkFieldName: string, modelName: string, targetModel: string) {
    let name = modelName;
    // usedChildNames prevents duplicate names in same model
    if (this.usedChildNames.has(targetModel + "." + singularize(name))) {
      name = this.trimId(fkFieldName);
      name = name + "_" + modelName;
    }
    // singularize in case one column name is the singularized form of another column in the same model
    name = singularize(name);
    this.usedChildNames.add(targetModel + "." + name);
    return recase(this.caseProp, name, true);
  }

  private trimId(name: string) {
    if (name.length > 3 && name.toLowerCase().endsWith("id")) {
      name = name.substring(0, name.length - 2);
    }
    if (name.endsWith("_")) {
      name = name.substring(0, name.length - 1);
    }
    return name;
  }

}
