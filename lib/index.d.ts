import {Sequelize, Options} from 'sequelize'

type AutoOptions = {
    spaces?: boolean;
    indentation?: number;
    directory?: string;
    additional?: object;
    freezeTableName?: boolean;
    tables?: string[];
    skipTables?: string[];
    isEgg?: boolean;
    camelCase?: boolean;
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
    tablesText: { [tableName: string]: string };
    tablesComments: { [tableName: string]: string };
    dialect: string;

    prepare(): Promise<AutoSequelize>;

    initModels(): void;

    outputFiles(): Promise<void>;

}