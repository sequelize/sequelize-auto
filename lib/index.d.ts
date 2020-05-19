import {Sequelize, Options} from 'sequelize'

type AutoOptions = {
    spaces?: boolean;
    indentation?: number;
    directory?: string;
    additional?: object;
    freezeTableName?: boolean;
    isEgg?: boolean;
    camelCase?: boolean;
    camelCaseForFileName?: boolean;
} & Options;

export declare class AutoSequelize {
    constructor(database: string, username: string, password: string, options?: AutoOptions);
    constructor(sequelize: Sequelize, options?: AutoOptions);

    sequelize: Sequelize;

    prepare(): Promise<AutoSequelize>;

    initModels(): void;

    outputFiles(): Promise<void>;

}