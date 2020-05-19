import {Sequelize, Options} from 'sequelize'

export declare class AutoSequelize {
    constructor(database: string, username: string, password: string, options?: {
        spaces?: boolean;
        indentation?: number;
        directory?: string;
        additional?: object;
        freezeTableName?: boolean;
        isEgg?: boolean;
        camelCase?: boolean;
        camelCaseForFileName?: boolean;
    } & Options);
    constructor(sequelize: Sequelize);

    sequelize: Sequelize;

    prepare(): Promise<AutoSequelize>;

    initModels(): void;

    outputFiles(): Promise<void>;

}