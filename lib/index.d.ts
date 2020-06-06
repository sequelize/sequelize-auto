import {Sequelize, Options, ModelOptions,ModelAttributes} from 'sequelize'

type AutoOptions = {
    directory?: string;
    additional?: ModelOptions;
    tables?: string[];
    skipTables?: string[];
    isEgg?: boolean;
    camelCase?: boolean;
    typescript?: boolean;
    camelCaseForFileName?: boolean;
} & Options;

type FieldConfig = {
    allowNull: boolean,
    primaryKey: boolean,
    autoIncrement: boolean,
    type: string,
    comment: string | null,
    foreignKey?: {
        foreignSources: { target_table: string, target_column: string }
    },
    defaultValue: null | string
}

export declare class AutoSequelize {
    constructor(database: string, username: string, password: string, options?: AutoOptions);
    constructor(sequelize: Sequelize, options?: AutoOptions);

    sequelize: Sequelize;
    tables: { [tableName: string]: { [fieldName: string]: FieldConfig } };
    tablesAttributes: { [tableName: string]: ModelAttributes };
    tablesText: { [tableName: string]: string };
    tablesOptionsText: { [tableName: string]: string };
    tablesOptions: { [tableName: string]: ModelOptions };
    tablesAttributesText: { [tableName: string]: string };
    tablesComments: { [tableName: string]: string };
    dialect: string;

    prepare(): Promise<AutoSequelize>;

    initModels(): void;

    outputFiles(): Promise<void>;

}