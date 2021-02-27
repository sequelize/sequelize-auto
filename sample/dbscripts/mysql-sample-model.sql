CREATE DATABASE IF NOT EXISTS "sequelize_auto_test";

CREATE DATABASE  IF NOT EXISTS `northwind` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `northwind`;

DROP TABLE IF EXISTS `order_item`;
DROP TABLE IF EXISTS `orderitem`;
DROP TABLE IF EXISTS `product`;
DROP TABLE IF EXISTS `supplier`;
DROP TABLE IF EXISTS `order`;
DROP TABLE IF EXISTS `customer`;

CREATE TABLE customer (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   FirstName            VARCHAR(40)         NOT NULL,
   LastName             VARCHAR(40)         NOT NULL,
   City                 VARCHAR(40)         NULL,
   Country              VARCHAR(40)         NULL,
   Phone                VARCHAR(20)         NULL,
   PRIMARY KEY (`Id`),
   KEY `Key_Customer_LastFirst` (`LastName`, `FirstName`)
);

CREATE TABLE `order` (
   Id                   INT                                    NOT NULL AUTO_INCREMENT,
   OrderDate            DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
   OrderNumber          VARCHAR(10)                            NULL,
   CustomerId           INT                                    NOT NULL,
   TotalAmount          DECIMAL(12,2)                          NULL DEFAULT 0,
   Status               ENUM('PROCESSING','SHIPPED','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
   PRIMARY KEY (`Id`),
   KEY `Key_Order_CustomerId` (`CustomerId`),
   KEY `Key_Order_OrderDate` (`OrderDate`)
);

CREATE TABLE order_item (
   Id                   INT                  NOT NULL AUTO_INCREMENT,
   OrderId              INT                  NOT NULL,
   ProductId            INT                  NOT NULL,
   UnitPrice            DECIMAL(12,2)        NOT NULL DEFAULT 0,
   Quantity             INT                  NOT NULL DEFAULT 1,
   PRIMARY KEY (`Id`),
   KEY `Key_Order_Item_OrderId` (`OrderId`),
   KEY `Key_Order_Item_ProductId` (`ProductId`)
);

CREATE TABLE product (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   ProductName          VARCHAR(50)         NOT NULL,
   SupplierId           INT                 NOT NULL,
   AltSupplierId        INT                 NULL,
   UnitPrice            DECIMAL(12,2)       NULL DEFAULT 0,
   Package              VARCHAR(30)         NULL,
   IsDiscontinued       bit                 NOT NULL DEFAULT 0,
   PRIMARY KEY (`Id`),
   KEY `Key_Product_SupplierId` (`SupplierId`),
   KEY `Key_Product_ProductName` (`ProductName`)
);

CREATE TABLE supplier (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   CompanyName          VARCHAR(40)         NOT NULL,
   ContactName          VARCHAR(50)         NULL,
   ContactTitle         VARCHAR(40)         NULL,
   City                 VARCHAR(40)         NULL,
   Country              VARCHAR(40)         NULL,
   Phone                VARCHAR(30)         NULL,
   Fax                  VARCHAR(30)         NULL,
   PRIMARY KEY (`Id`),
   KEY `Key_Supplier_CompanyName` (`CompanyName`),
   KEY `Key_Supplier_Country` (`Country`)
);


ALTER TABLE `order`
  ADD CONSTRAINT `FK_Order_Customer` FOREIGN KEY (`CustomerId`) REFERENCES customer (`Id`);

ALTER TABLE order_item
   ADD CONSTRAINT `FK_OrderItem_Order` FOREIGN KEY (`OrderId`) REFERENCES `order` (`Id`);

ALTER TABLE order_item
   ADD CONSTRAINT `FK_OrderItem_Product` FOREIGN KEY (`ProductId`) REFERENCES product (`Id`);

ALTER TABLE product
   ADD CONSTRAINT `FK_Product_Supplier` FOREIGN KEY (`SupplierId`) REFERENCES supplier (`Id`);
ALTER TABLE product
   ADD CONSTRAINT `FK_Product_Alt_Supplier` FOREIGN KEY (`AltSupplierId`) REFERENCES supplier (`Id`);

