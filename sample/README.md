# Sample App

This is a sample that demonstrates exporting a Sequelize model from a database,
and using that model to perform a query and update.

The sample uses the "northwind" database, a simple model with only 5 tables.

Scripts are provided (in the [dbscripts](./dbscripts) directory) to create the database schema and 
load it with data.

## Steps

### 1. Create Database

Go to the [dbscripts](./dbscripts) directory.  Run the `{dialect}-sample-model.sql` and `{dialect}-sample-data.sql`
scripts for your chosen database dialect (mssql, mysql, postgres, or sqlite).  

If using sqlite, you can use the provided node script:

    node sqlite-import.js

For the other dialects, run the script using the administration tool provided with the dbms.

### 2. Configure

Return to the [sample](.) directory.  Edit the `config.js`.

Set the username and password for your database dialect.  Set the appropriate dialect in the `module.exports` statement on the last line.

Also set the **typescript** option to true or false in the `options` object on line 3.

### 3. Export Models using SequelizeAuto

Export the models from the database using the `export.js` script:

    node export.js

This writes the model files into the [models](./models) directory.

### 4. Compile the models (TypeScript only)

If using TypeScript, compile the TypeScript sample app and the models:

    tsc

### 5. Run the app

Run the sample app.  For TypeScript, it's 

    node sample-ts

For JavaScript, it's

    node sample-es5




