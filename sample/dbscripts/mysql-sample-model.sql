CREATE DATABASE  IF NOT EXISTS `Northwind` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `Northwind`;

DROP TABLE IF EXISTS `OrderItem`;
DROP TABLE IF EXISTS `Product`;
DROP TABLE IF EXISTS `Supplier`;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS `Customer`;

CREATE TABLE Customer (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   FirstName            VARCHAR(40)         NOT NULL,
   LastName             VARCHAR(40)         NOT NULL,
   City                 VARCHAR(40)         NULL,
   Country              VARCHAR(40)         NULL,
   Phone                VARCHAR(20)         NULL,
   PRIMARY KEY (`Id`),
   KEY `Key_Customer_LastFirst` (`LastName`, `FirstName`)
);

CREATE TABLE `Order` (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   OrderDate            DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
   OrderNumber          VARCHAR(10)         NULL,
   CustomerId           INT                 NOT NULL,
   TotalAmount          DECIMAL(12,2)       NULL DEFAULT 0,
   PRIMARY KEY (`Id`),
   KEY `Key_Order_CustomerId` (`CustomerId`),
   KEY `Key_Order_OrderDate` (`OrderDate`)
);

CREATE TABLE OrderItem (
   Id                   INT                  NOT NULL AUTO_INCREMENT,
   OrderId              INT                  NOT NULL,
   ProductId            INT                  NOT NULL,
   UnitPrice            DECIMAL(12,2)        NOT NULL DEFAULT 0,
   Quantity             INT                  NOT NULL DEFAULT 1,
   PRIMARY KEY (`Id`),
   KEY `Key_OrderItem_OrderId` (`OrderId`),
   KEY `Key_OrderItem_ProductId` (`ProductId`)
);

CREATE TABLE Product (
   Id                   INT                 NOT NULL AUTO_INCREMENT,
   ProductName          VARCHAR(50)         NOT NULL,
   SupplierId           INT                 NOT NULL,
   UnitPrice            DECIMAL(12,2)       NULL DEFAULT 0,
   Package              VARCHAR(30)         NULL,
   IsDiscontinued       bit                 NOT NULL DEFAULT 0,
   PRIMARY KEY (`Id`),
   KEY `Key_Product_SupplierId` (`SupplierId`),
   KEY `Key_Product_ProductName` (`ProductName`)
);

CREATE TABLE Supplier (
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


ALTER TABLE `Order`
  ADD CONSTRAINT `FK_Order_Customer` FOREIGN KEY (`CustomerId`) REFERENCES `Customer` (`Id`);

ALTER TABLE `OrderItem`
   ADD CONSTRAINT `FK_OrderItem_Order` FOREIGN KEY (`OrderId`) REFERENCES `Order` (`Id`);

ALTER TABLE `OrderItem`
   ADD CONSTRAINT `FK_OrderItem_Product` FOREIGN KEY (`ProductId`) REFERENCES `Product` (`Id`);

ALTER TABLE `Product`
   ADD CONSTRAINT `FK_Product_Supplier` FOREIGN KEY (`SupplierId`) REFERENCES `Supplier` (`Id`);

