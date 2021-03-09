# Sequelize-Auto

<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/sequelize/sequelize-auto.svg)](https://greenkeeper.io/) -->

[![Build Status](http://img.shields.io/travis/sequelize/sequelize-auto/master.svg)](https://travis-ci.org/sequelize/sequelize-auto) [![Build status](https://ci.appveyor.com/api/projects/status/bf9lb89rmpj6iveb?svg=true)](https://ci.appveyor.com/project/durango/sequelize-auto) [![Code Climate](https://codeclimate.com/github/sequelize/sequelize-auto/badges/gpa.svg)](https://codeclimate.com/github/sequelize/sequelize-auto) [![Test Coverage](https://codeclimate.com/github/sequelize/sequelize-auto/badges/coverage.svg)](https://codeclimate.com/github/sequelize/sequelize-auto/coverage)

Automatically generate models for [SequelizeJS](https://github.com/sequelize/sequelize) via the command line.

## Install

    npm install sequelize-auto

## Prerequisites

You will need to install `sequelize`; it's no longer installed by `sequelize-auto`.

You will need to install the correct dialect binding before using sequelize-auto.

Dialect | Install
---|---
MySQL/MariaDB | `npm install sequelize mysql2`
Postgres | `npm install sequelize pg pg-hstore`
Sqlite | `npm install sequelize sqlite3`
MSSQL | `npm install sequelize tedious`


## Usage

    sequelize-auto -h <host> -d <database> -u <user> -x [password] -p [port]  --dialect [dialect] -c [/path/to/config] -o [/path/to/models] -t [tableName]
```
Options:
    --help               Show help                                   [boolean]
    --version            Show version number                         [boolean]
-h, --host               IP/Hostname for the database.                [string]
-d, --database           Database name.                               [string]
-u, --user               Username for database.                       [string]
-x, --pass               Password for database. If specified without providing
                          a password, it will be requested interactively from
                          the terminal.
-p, --port               Port number for database (not for sqlite). Ex:
                          MySQL/MariaDB: 3306, Postgres: 5432, MSSQL: 1433
                                                                      [number]
-c, --config             Path to JSON file for Sequelize-Auto options and
                          Sequelize's constructor "options" flag object as
                          defined here:
                          https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
                                                                      [string]
-o, --output             What directory to place the models.          [string]
-e, --dialect            The dialect/engine that you're using: postgres,
                          mysql, sqlite, mssql                         [string]
-a, --additional         Path to JSON file containing model options (for all
                          tables). See the options: https://sequelize.org/master/class/lib/model.js~Model.html#static-method-init
                                                                      [string]
-t, --tables             Space-separated names of tables to import     [array]
-T, --skipTables         Space-separated names of tables to skip       [array]
    --caseModel, --cm    Set case of model names: c|l|o|p|u
                          c = camelCase
                          l = lower_case
                          o = original (default)
                          p = PascalCase
                          u = UPPER_CASE
    --caseFile, --cf     Set case of file names: c|l|o|p|u
    --caseProp, --cp     Set case of property names: c|l|o|p|u
-n, --noWrite            Prevent writing the models to disk.         [boolean]
-s, --schema             Database schema from which to retrieve tables[string]
-v, --views              Include database views in generated models  [boolean]
-l, --lang               Language for Model output: es5|es6|esm|ts
                          es5 = ES5 CJS modules (default)
                          es6 = ES6 CJS modules
                          esm = ES6 ESM modules
                          ts = TypeScript                              [string]
    --singularize, --sg  Singularize model and file names from plural table
                          names                                       [boolean]
```

> On Windows, provide the path to sequelize-auto: `node_modules\.bin\sequelize-auto [args]`

## Example

    sequelize-auto -o "./models" -d sequelize_auto_test -h localhost -u my_username -p 5432 -x my_password -e postgres

Produces a file/files such as `./models/User.js` which looks like:

```js
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    aNumber: {
      type: DataTypes.SMALLINT,
      allowNull: true
    },
    dateAllowNullTrue: {
      type: DataTypes.DATE,
      allowNull: true
    },
    defaultValueBoolean: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'User',
  });
};
```

Sequelize-auto also generates an initialization file, `./models/init-models.js`, which contains the code to load each model definition into Sequelize:

```js
var DataTypes = require("sequelize").DataTypes;
var _User = require("./User");
var _Product = require("./Product");

function initModels(sequelize) {
  var User = _User(sequelize, DataTypes);
  var Product = _Product(sequelize, DataTypes);

  return {
    User,
    Product,
  };
}
module.exports = { initModels };
```

This makes it easy to import all your models into Sequelize by calling `initModels(sequelize)`.

```js
var initModels = require("./models/init-models");
...
var models = initModels(sequelize);

models.User.findAll({ where: { username: "tony" }}).then(...);
```

Alternatively, you can [Sequelize.import](http://docs.sequelizejs.com/en/latest/docs/models-definition/#import) each model (for Sequelize versions < 6), or `require` each file and call the returned function:

```js
var User = require('path/to/user')(sequelize, DataTypes);
```

## ES6

You can use the `-l es6` option to create the model definition files as ES6 classes, or `-l esm` option to create ES6 modules.  Then you would `require` or `import` the classes and call the `init(sequelize, DataTypes)` method on each class.

## TypeScript

Add `-l ts` to cli options or `lang: 'ts'` to programmatic options.  This will generate a TypeScript class in each model file, and an `init-model.ts` file
to import and initialize all the classes.

> Note that you need TypeScript **4.x** to compile the generated files.

The TypeScript model classes are created as described in the [Sequelize manual](https://sequelize.org/master/manual/typescript.html)

Example model class, `order.ts`:

```js
import Sequelize, { DataTypes, Model, Optional } from 'sequelize';
import type { Customer, CustomerId } from './customer';
import type { OrderItem, OrderItemId } from './order_item';

export interface OrderAttributes {
  id: number;
  orderDate: Date;
  orderNumber?: string;
  customerId: number;
  totalAmount?: number;
  status: 'PROCESSING' | 'SHIPPED' | 'UNKNOWN';
}

export type OrderPk = "id";
export type OrderId = Order[OrderPk];
export type OrderCreationAttributes = Optional<OrderAttributes, OrderPk>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  id!: number;
  orderDate!: Date;
  orderNumber?: string;
  customerId!: number;
  totalAmount?: number;
  status!: 'PROCESSING' | 'SHIPPED' | 'UNKNOWN';

  // Order belongsTo Customer via customerId
  customer!: Customer;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<Customer>;
  setCustomer!: Sequelize.BelongsToSetAssociationMixin<Customer, CustomerId>;
  createCustomer!: Sequelize.BelongsToCreateAssociationMixin<Customer>;
  // Order hasMany OrderItem via orderId
  orderItems!: OrderItem[];
  getOrderItems!: Sequelize.HasManyGetAssociationsMixin<OrderItem>;
  setOrderItems!: Sequelize.HasManySetAssociationsMixin<OrderItem, OrderItemId>;
  addOrderItem!: Sequelize.HasManyAddAssociationMixin<OrderItem, OrderItemId>;
  addOrderItems!: Sequelize.HasManyAddAssociationsMixin<OrderItem, OrderItemId>;
  createOrderItem!: Sequelize.HasManyCreateAssociationMixin<OrderItem>;
  removeOrderItem!: Sequelize.HasManyRemoveAssociationMixin<OrderItem, OrderItemId>;
  removeOrderItems!: Sequelize.HasManyRemoveAssociationsMixin<OrderItem, OrderItemId>;
  hasOrderItem!: Sequelize.HasManyHasAssociationMixin<OrderItem, OrderItemId>;
  hasOrderItems!: Sequelize.HasManyHasAssociationsMixin<OrderItem, OrderItemId>;
  countOrderItems!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof Order {
    Order.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'OrderDate'
    },
    orderNumber: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'OrderNumber'
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customer',
        key: 'Id'
      },
      field: 'CustomerId'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'TotalAmount'
    },
    status: {
      type: DataTypes.ENUM('PROCESSING','SHIPPED','UNKNOWN'),
      allowNull: false,
      defaultValue: "UNKNOWN",
      field: 'Status'
    }
  }, {
    sequelize,
    tableName: 'order',
    timestamps: false,
  });
  return Order;
  }
}
```

Example `init-models.ts`:

```js
import { Sequelize } from "sequelize";
import { Customer, CustomerAttributes, CustomerCreationAttributes } from "./customer";
import { Order, OrderAttributes, OrderCreationAttributes } from "./order";
import { OrderItem, OrderItemAttributes, OrderItemCreationAttributes } from "./order_item";
import { Product, ProductAttributes, ProductCreationAttributes } from "./product";
import { Supplier, SupplierAttributes, SupplierCreationAttributes } from "./supplier";

export {
  Customer, CustomerAttributes, CustomerCreationAttributes,
  Order, OrderAttributes, OrderCreationAttributes,
  OrderItem, OrderItemAttributes, OrderItemCreationAttributes,
  Product, ProductAttributes, ProductCreationAttributes,
  Supplier, SupplierAttributes, SupplierCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  Customer.initModel(sequelize);
  Order.initModel(sequelize);
  OrderItem.initModel(sequelize);
  Product.initModel(sequelize);
  Supplier.initModel(sequelize);

  Order.belongsTo(Customer, { as: "customer", foreignKey: "customerId"});
  Customer.hasMany(Order, { as: "orders", foreignKey: "customerId"});
  OrderItem.belongsTo(Order, { as: "order", foreignKey: "orderId"});
  Order.hasMany(OrderItem, { as: "orderItems", foreignKey: "orderId"});
  OrderItem.belongsTo(Product, { as: "product", foreignKey: "productId"});
  Product.hasMany(OrderItem, { as: "orderItems", foreignKey: "productId"});
  Product.belongsTo(Supplier, { as: "supplier", foreignKey: "supplierId"});
  Supplier.hasMany(Product, { as: "products", foreignKey: "supplierId"});

  return {
    Customer: Customer,
    OrderItem: OrderItem,
    Order: Order,
    Product: Product,
    Supplier: Supplier,
  };
}
```

Model usage in a TypeScript program:

```js
// Order is the sequelize Model class
// OrderAttributes is the interface defining the fields
// OrderCreationAttributes is the interface defining the fields when creating a new record
import { initModels, Order, OrderCreationAttributes } from "./models/init-models";

// import models into sequelize instance
initModels(this.sequelize);

const myOrders = await Order.findAll({ where: { "customerId": cust.id }, include: ['customer'] });

const attr: OrderCreationAttributes = {
  customerId: cust.id,
  orderDate: new Date(),
  orderNumber: "ORD123",
  totalAmount: 223.45
};
const newOrder = await Order.create(attr);
```


## Configuration options

For the `-c, --config` option, various JSON/configuration parameters are defined by Sequelize's `options` flag within the constructor. See the [Sequelize docs](https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor) for more info.

## Programmatic API

```js
const SequelizeAuto = require('sequelize-auto');
const auto = new SequelizeAuto('database', 'user', 'pass');

auto.run().then(data => {
  console.log(data.tables);      // table and field list
  console.log(data.foreignKeys); // table foreign key list
  console.log(data.indexes);     // table indexes
  console.log(data.hasTriggerTables); // tables that have triggers
  console.log(data.relations);   // relationships between models
  console.log(data.text)         // text of generated models
});
```

With options:

```js
const auto = new SequelizeAuto('database', 'user', 'pass', {
    host: 'localhost',
    dialect: 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
    directory: './models', // where to write files
    port: 'port',
    caseModel: 'c', // convert snake_case column names to camelCase field names: user_id -> userId
    caseFile: 'c', // file names created for each model use camelCase.js not snake_case.js
    singularize: true, // convert plural table names to singular model names
    additional: {
        timestamps: false
        // ...options added to each model
    },
    tables: ['table1', 'table2', 'myschema.table3'] // use all tables, if omitted
    //...
})
```

Or you can create the `sequelize` instance first, using a [connection string](https://sequelize.org/master/manual/getting-started.html#connecting-to-a-database),
and then pass it to SequelizeAuto:
```js
const SequelizeAuto = require('sequelize-auto');
const Sequelize = require('sequelize');

// const sequelize = new Sequelize('sqlite::memory:');
const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname');
const options = { caseFile: 'l', caseModel: 'p', caseProp: 'c' };

const auto = new SequelizeAuto(sequelize, null, null, options);
auto.run();
```

## Resources

 - [Changelog](https://github.com/sequelize/sequelize-auto/blob/master/CHANGELOG.md)

## Testing

To set up:

1. Create an empty database called `sequelize_auto_test` on your database server (sqlite excepted)
2. Create a `.env` file from `sample.env` and set your username/password/port etc.  The env is read by `test/config.js`
3. Build the TypeScript from the `src` directory into the `lib` directory:

    `npm run build`

Then run one of the test commands below:

    # mysql only
    npm run test-mysql

    # postgres only
    npm run test-postgres

    # mssql  only
    npm run test-mssql

    # sqlite only
    npm run test-sqlite

Also see the [sample](https://github.com/sequelize/sequelize-auto/tree/master/sample) directory which has an example including database scripts, export script, and a sample app.
