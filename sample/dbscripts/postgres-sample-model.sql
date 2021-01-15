--DROP DATABASE IF EXISTS "Northwind";
--CREATE DATABASE "Northwind";
-- Need to do the above separately, then reconnect to Northwind database

DROP TABLE IF EXISTS "OrderItem";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "Supplier";
DROP TABLE IF EXISTS "Order";
DROP TABLE IF EXISTS "Customer";

CREATE TABLE "Customer" (
   "Id"                   INT                 GENERATED BY DEFAULT AS IDENTITY ,
   "FirstName"            VARCHAR(40)         NOT NULL,
   "LastName"             VARCHAR(40)         NOT NULL,
   "City"                 VARCHAR(40)         NULL,
   "Country"              VARCHAR(40)         NULL,
   "Phone"                VARCHAR(20)         NULL,
   CONSTRAINT "PK_Customer_Id" PRIMARY KEY ("Id"),
   CONSTRAINT "UN_Customer_LastName_Firstname" UNIQUE ("LastName", "FirstName")
);

CREATE TYPE StatusEnum AS ENUM ('ORDERED','SHIPPED','PROCESSING');
CREATE TABLE "Order" (
   "Id"                   INT                 GENERATED BY DEFAULT AS IDENTITY,
   "OrderDate"            TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
   "OrderNumber"          VARCHAR(10)         NULL,
   "CustomerId"           INT                 NOT NULL,
   "TotalAmount"          DECIMAL(12,2)       NULL DEFAULT 0,
   "Status"               StatusEnum          NOT NULL DEFAULT 'UNKNOWN',
   CONSTRAINT "PK_Order_Id" PRIMARY KEY ("Id"),
   CONSTRAINT "UN_Order_CustomerId_OrderDate" UNIQUE ("CustomerId", "OrderDate", "OrderNumber"),
   CONSTRAINT "UN_Order_OrderNumber" UNIQUE ("OrderNumber")
);

CREATE TABLE "OrderItem" (
   "Id"                   INT                  GENERATED BY DEFAULT AS IDENTITY,
   "OrderId"              INT                  NOT NULL,
   "ProductId"            INT                  NOT NULL,
   "UnitPrice"            DECIMAL(12,2)        NOT NULL DEFAULT 0,
   "Quantity"             INT                  NOT NULL DEFAULT 1,
   CONSTRAINT "PK_OrderItem_Id" PRIMARY KEY ("Id"),
   CONSTRAINT "UN_OrderItem_OrderId_ProductId" UNIQUE ("OrderId", "ProductId")
);

CREATE TABLE "Product" (
   "Id"                   INT                 GENERATED BY DEFAULT AS IDENTITY,
   "ProductName"          VARCHAR(50)         NOT NULL,
   "SupplierId"           INT                 NOT NULL,
   "UnitPrice"            DECIMAL(12,2)       NULL DEFAULT 0,
   "Package"              VARCHAR(30)         NULL,
   "IsDiscontinued"       BOOLEAN             NOT NULL DEFAULT false,
   CONSTRAINT "PK_Product_Id" PRIMARY KEY ("Id"),
   CONSTRAINT "UN_Product_ProductName" UNIQUE ("ProductName")
);

CREATE TABLE "Supplier" (
   "Id"                   INT                 GENERATED BY DEFAULT AS IDENTITY,
   "CompanyName"          VARCHAR(40)         NOT NULL,
   "ContactName"          VARCHAR(50)         NULL,
   "ContactTitle"         VARCHAR(40)         NULL,
   "City"                 VARCHAR(40)         NULL,
   "Country"              VARCHAR(40)         NULL,
   "Phone"                VARCHAR(30)         NULL,
   "Fax"                  VARCHAR(30)         NULL,
   CONSTRAINT "PK_Supplier_Id" PRIMARY KEY ("Id"),
   CONSTRAINT "UN_Supplier_CompanyName" UNIQUE ("CompanyName", "Country")
);


ALTER TABLE "Order"
  ADD CONSTRAINT "FK_Order_Customer" FOREIGN KEY ("CustomerId") REFERENCES "Customer" ("Id");

ALTER TABLE "OrderItem"
   ADD CONSTRAINT "FK_OrderItem_Order" FOREIGN KEY ("OrderId") REFERENCES "Order" ("Id");

ALTER TABLE "OrderItem"
   ADD CONSTRAINT "FK_OrderItem_Product" FOREIGN KEY ("ProductId") REFERENCES "Product" ("Id");

ALTER TABLE "Product"
   ADD CONSTRAINT "FK_Product_Supplier" FOREIGN KEY ("SupplierId") REFERENCES "Supplier" ("Id");

