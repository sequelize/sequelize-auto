const { AutoRelater } = require('../lib/auto-relater');

// Data from mysql version of Northwind sample, with some additional relationships.
const northwindTableData = { 
  tables: {
    order: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      OrderDate: {
        type: 'DATETIME',
        allowNull: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      OrderNumber: {
        type: 'VARCHAR(10)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      CustomerId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      TotalAmount: {
        type: 'DECIMAL(12,2)',
        allowNull: true,
        defaultValue: '0.00',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Status: {
        type: "ENUM('PROCESSING','SHIPPED','UNKNOWN')",
        allowNull: false,
        defaultValue: 'UNKNOWN',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      }
    },
    product: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      ProductName: {
        type: 'VARCHAR(50)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      SupplierId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      AltSupplierId: {
        type: 'INT(11)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      UnitPrice: {
        type: 'DECIMAL(12,2)',
        allowNull: true,
        defaultValue: '0.00',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Package: {
        type: 'VARCHAR(30)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      IsDiscontinued: {
        type: 'BIT(1)',
        allowNull: false,
        defaultValue: "b'0'",
        primaryKey: false,
        autoIncrement: false,
        comment: null
      }
    },
    related_product: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      ProductId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      RelatedProductId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
    },
    order_item: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      OrderId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      ProductId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      UnitPrice: {
        type: 'DECIMAL(12,2)',
        allowNull: false,
        defaultValue: '0.00',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Quantity: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: '1',
        primaryKey: false,
        autoIncrement: false,
        comment: null
      }
    },
    supplier: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      CompanyName: {
        type: 'VARCHAR(40)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      ContactName: {
        type: 'VARCHAR(50)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      ContactTitle: {
        type: 'VARCHAR(40)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      City: {
        type: 'VARCHAR(40)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Country: {
        type: 'VARCHAR(40)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Phone: {
        type: 'VARCHAR(30)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Fax: {
        type: 'VARCHAR(30)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      }
    },
    customer: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      FirstName: {
        type: 'VARCHAR(40)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      LastName: {
        type: 'VARCHAR(40)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      City: {
        type: 'VARCHAR(40)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Country: {
        type: 'VARCHAR(40)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
      Phone: {
        type: 'VARCHAR(20)',
        allowNull: true,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      }
    },
    tag: {
      Id: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: true,
        comment: null
      },
      Name: {
        type: 'VARCHAR(40)',
        allowNull: false,
        defaultValue: null,
        primaryKey: false,
        autoIncrement: false,
        comment: null
      },
    },
    product_tag: {
      ProductId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: false,
        comment: null
      },
      TagId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: false,
        comment: null
      },
    },
    other_tag: {
      ProductId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: false,
        comment: null
      },
      TagId: {
        type: 'INT(11)',
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: false,
        comment: null
      },
    },
  },
  foreignKeys: {
    order: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'order',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      },
      CustomerId: {
        constraint_name: 'FK_Order_Customer',
        source_schema: 'northwind',
        source_table: 'order',
        source_column: 'CustomerId',
        target_schema: 'northwind',
        target_table: 'customer',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'order',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'customer',
          source_column: 'CustomerId',
          target_column: 'Id'
        }
      }
    },
    product: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'product',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      },
      SupplierId: {
        constraint_name: 'FK_Product_Supplier',
        source_schema: 'northwind',
        source_table: 'product',
        source_column: 'SupplierId',
        target_schema: 'northwind',
        target_table: 'supplier',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'product',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'supplier',
          source_column: 'SupplierId',
          target_column: 'Id'
        }
      },
      AltSupplierId: {
        constraint_name: 'FK_Product_Alt_Supplier',
        source_schema: 'northwind',
        source_table: 'product',
        source_column: 'AltSupplierId',
        target_schema: 'northwind',
        target_table: 'supplier',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'product',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'supplier',
          source_column: 'AltSupplierId',
          target_column: 'Id'
        }
      }
    },
    related_product: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'related_product',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      },
      ProductId: {
        constraint_name: 'FK_RelatedProduct_Product',
        source_schema: 'northwind',
        source_table: 'related_product',
        source_column: 'ProductId',
        target_schema: 'northwind',
        target_table: 'product',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'related_product',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'product',
          source_column: 'ProductId',
          target_column: 'Id'
        }
      },
      RelatedProductId: {
        constraint_name: 'FK_RelatedProduct_Product2',
        source_schema: 'northwind',
        source_table: 'related_product',
        source_column: 'RelatedProductId',
        target_schema: 'northwind',
        target_table: 'product',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'related_product',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'product',
          source_column: 'RelatedProductId',
          target_column: 'Id'
        }
      },
    },
    order_item: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'order_item',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      },
      OrderId: {
        constraint_name: 'FK_OrderItem_Order',
        source_schema: 'northwind',
        source_table: 'order_item',
        source_column: 'OrderId',
        target_schema: 'northwind',
        target_table: 'order',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'order_item',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'order',
          source_column: 'OrderId',
          target_column: 'Id'
        }
      },
      ProductId: {
        constraint_name: 'FK_OrderItem_Product',
        source_schema: 'northwind',
        source_table: 'order_item',
        source_column: 'ProductId',
        target_schema: 'northwind',
        target_table: 'product',
        target_column: 'Id',
        extra: '',
        column_key: 'MUL',
        isForeignKey: true,
        foreignSources: {
          source_table: 'order_item',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'product',
          source_column: 'ProductId',
          target_column: 'Id'
        }
      }
    },
    supplier: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'supplier',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      }
    },
    customer: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'customer',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      }
    },
    tag: {
      Id: {
        constraint_name: 'PRIMARY',
        source_schema: 'northwind',
        source_table: 'tag',
        source_column: 'Id',
        target_schema: null,
        target_table: null,
        target_column: null,
        extra: 'auto_increment',
        column_key: 'PRI',
        isPrimaryKey: true,
        isSerialKey: true
      }
    },
    product_tag: {
      ProductId: {
        source_table: 'product_tag',
        constraint_name: 'PK_product_tag',
        source_schema: 'northwind',
        source_column: 'ProductId',
        target_table: null,
        target_schema: null,
        target_column: null,
        is_identity: false,
        isForeignKey: true,
        foreignSources: {
          source_table: 'product_tag',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'product',
          source_column: 'ProductId',
          target_column: 'Id'
        },
        isPrimaryKey: true
      },
      TagId: {
        source_table: 'product_tag',
        constraint_name: 'PK_product_tag',
        source_schema: 'northwind',
        source_column: 'TagId',
        target_table: null,
        target_schema: null,
        target_column: null,
        is_identity: false,
        isForeignKey: true,
        foreignSources: {
          source_table: 'product_tag',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'tag',
          source_column: 'TagId',
          target_column: 'Id'
        },
        isPrimaryKey: true
      }
    },
    other_tag: {
      ProductId: {
        source_table: 'other_tag',
        constraint_name: 'PK_other_tag',
        source_schema: 'northwind',
        source_column: 'ProductId',
        target_table: null,
        target_schema: null,
        target_column: null,
        is_identity: false,
        isForeignKey: true,
        foreignSources: {
          source_table: 'other_tag',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'product',
          source_column: 'ProductId',
          target_column: 'Id'
        },
        isPrimaryKey: true
      },
      TagId: {
        source_table: 'other_tag',
        constraint_name: 'PK_other_tag',
        source_schema: 'northwind',
        source_column: 'TagId',
        target_table: null,
        target_schema: null,
        target_column: null,
        is_identity: false,
        isForeignKey: true,
        foreignSources: {
          source_table: 'other_tag',
          source_schema: 'northwind',
          target_schema: 'northwind',
          target_table: 'tag',
          source_column: 'TagId',
          target_column: 'Id'
        },
        isPrimaryKey: true
      }
    },
  },
  indexes: {
    // removed
  },
  hasTriggerTables: { customer: true },
  relations: []
};

function buildRelatedTableData() {
  let td = JSON.parse(JSON.stringify(northwindTableData));

  const relater = new AutoRelater({
    caseModel: 'p',
    caseProp: 'c',
    singularize: true
  });
  td = relater.buildRelations(td);
  return td;
};

module.exports = {
  tableData: northwindTableData,
  buildRelatedTableData: buildRelatedTableData
};