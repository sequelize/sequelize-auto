# Sequelize-Auto

Automatically generate models for [SequelizeJS](https://github.com/sequelize/sequelize) via the command line.

## Install

    npm install sequelize-auto

## Usage

    sequelize-auto -h <host> -d <database> -u <user> -x [password] -p [port]  --dialect [dialect] -c [/path/to/config] -o [/path/to/models]

    Options:
      -h, --host      IP/Hostname for the database.                                      [required]
      -d, --database  Database name.                                                     [required]
      -u, --user      Username for database.                                             [required]
      -x, --pass      Password for database.
      -p, --port      Port number for database.
      -c, --config    JSON file for sending additional options to the Sequelize object.
      -o, --output    What directory to place the models.
      -e, --dialect   The dialect/engine that you're using: postgres, mysql, sqlite

## Example

    sequelize-auto -o "/Users/daniel/fracture-repo/auto-sequelize/spec/models" -d sequelize_auto_test -h localhost -u daniel -p 5432 -x my_password -e postgres

## Testing

You must setup a database called "sequelize_auto_test" first, edit the spec/config.js file accordingly, and then enter in any of the following:

    # for all
    npm run test-buster

    # mysql only
    npm run test-buster-mysql

    # postgres only
    npm run test-buster-postgres

    # postgres-native only
    npm run test-buster-postgres-native