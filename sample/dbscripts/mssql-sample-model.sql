USE master
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'Northwind')
BEGIN
  CREATE DATABASE Northwind
END
GO

USE Northwind
GO

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('"Order"') and o.name = 'FK_ORDER_REFERENCE_CUSTOMER')
alter table "Order"
   drop constraint FK_ORDER_REFERENCE_CUSTOMER
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('OrderItem') and o.name = 'FK_ORDERITE_REFERENCE_ORDER')
alter table OrderItem
   drop constraint FK_ORDERITE_REFERENCE_ORDER
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('OrderItem') and o.name = 'FK_ORDERITE_REFERENCE_PRODUCT')
alter table OrderItem
   drop constraint FK_ORDERITE_REFERENCE_PRODUCT
go

if exists (select 1
   from sys.sysreferences r join sys.sysobjects o on (o.id = r.constid and o.type = 'F')
   where r.fkeyid = object_id('Product') and o.name = 'FK_PRODUCT_REFERENCE_SUPPLIER')
alter table Product
   drop constraint FK_PRODUCT_REFERENCE_SUPPLIER
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('Customer')
            and   name  = 'IndexCustomerName'
            and   indid > 0
            and   indid < 255)
   drop index Customer.IndexCustomerName
go

if exists (select 1
            from  sysobjects
           where  id = object_id('Customer')
            and   type = 'U')
   drop table Customer
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('"Order"')
            and   name  = 'IndexOrderOrderDate'
            and   indid > 0
            and   indid < 255)
   drop index "Order".IndexOrderOrderDate
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('"Order"')
            and   name  = 'IndexOrderCustomerId'
            and   indid > 0
            and   indid < 255)
   drop index "Order".IndexOrderCustomerId
go

if exists (select 1
            from  sysobjects
           where  id = object_id('"Order"')
            and   type = 'U')
   drop table "Order"
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('OrderItem')
            and   name  = 'IndexOrderItemProductId'
            and   indid > 0
            and   indid < 255)
   drop index OrderItem.IndexOrderItemProductId
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('OrderItem')
            and   name  = 'IndexOrderItemOrderId'
            and   indid > 0
            and   indid < 255)
   drop index OrderItem.IndexOrderItemOrderId
go

if exists (select 1
            from  sysobjects
           where  id = object_id('OrderItem')
            and   type = 'U')
   drop table OrderItem
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('Product')
            and   name  = 'IndexProductName'
            and   indid > 0
            and   indid < 255)
   drop index Product.IndexProductName
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('Product')
            and   name  = 'IndexProductSupplierId'
            and   indid > 0
            and   indid < 255)
   drop index Product.IndexProductSupplierId
go

if exists (select 1
            from  sysobjects
           where  id = object_id('Product')
            and   type = 'U')
   drop table Product
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('Supplier')
            and   name  = 'IndexSupplierCountry'
            and   indid > 0
            and   indid < 255)
   drop index Supplier.IndexSupplierCountry
go

if exists (select 1
            from  sysindexes
           where  id    = object_id('Supplier')
            and   name  = 'IndexSupplierName'
            and   indid > 0
            and   indid < 255)
   drop index Supplier.IndexSupplierName
go

if exists (select 1
            from  sysobjects
           where  id = object_id('Supplier')
            and   type = 'U')
   drop table Supplier
go

/*==============================================================*/
/* Table: Customer                                              */
/*==============================================================*/
create table Customer (
   Id                   int                  identity,
   FirstName            nvarchar(40)         not null,
   LastName             nvarchar(40)         not null,
   City                 nvarchar(40)         null,
   Country              nvarchar(40)         null,
   Phone                nvarchar(20)         null,
   constraint PK_CUSTOMER primary key (Id)
)
go

/*==============================================================*/
/* Index: IndexCustomerName                                     */
/*==============================================================*/
create index IndexCustomerName on Customer (
LastName ASC,
FirstName ASC
)
go

/*==============================================================*/
/* Table: "Order"                                               */
/*==============================================================*/
create table "Order" (
   Id                   int                  identity,
   OrderDate            datetime             not null default getdate(),
   OrderNumber          nvarchar(10)         null,
   CustomerId           int                  not null,
   TotalAmount          decimal(12,2)        null default 0,
   Status               varchar(20)          not null default 'UNKNOWN' check (Status in('PROCESSING','SHIPPED','UNKNOWN'))
   constraint PK_ORDER primary key (Id)
)
go

/*==============================================================*/
/* Index: IndexOrderCustomerId                                  */
/*==============================================================*/
create index IndexOrderCustomerId on "Order" (
CustomerId ASC
)
go

/*==============================================================*/
/* Index: IndexOrderOrderDate                                   */
/*==============================================================*/
create index IndexOrderOrderDate on "Order" (
OrderDate ASC
)
go

/*==============================================================*/
/* Table: OrderItem                                             */
/*==============================================================*/
create table OrderItem (
   Id                   int                  identity,
   OrderId              int                  not null,
   ProductId            int                  not null,
   UnitPrice            decimal(12,2)        not null default 0,
   Quantity             int                  not null default 1,
   constraint PK_ORDERITEM primary key (Id)
)
go

/*==============================================================*/
/* Index: IndexOrderItemOrderId                                 */
/*==============================================================*/
create index IndexOrderItemOrderId on OrderItem (
OrderId ASC
)
go

/*==============================================================*/
/* Index: IndexOrderItemProductId                               */
/*==============================================================*/
create index IndexOrderItemProductId on OrderItem (
ProductId ASC
)
go

/*==============================================================*/
/* Table: Product                                               */
/*==============================================================*/
create table Product (
   Id                   int                  identity,
   ProductName          nvarchar(50)         not null,
   SupplierId           int                  not null,
   AltSupplierId        int                  null,
   UnitPrice            decimal(12,2)        null default 0,
   Package              nvarchar(30)         null,
   IsDiscontinued       bit                  not null default 0,
   constraint PK_PRODUCT primary key (Id)
)
go

/*==============================================================*/
/* Index: IndexProductSupplierId                                */
/*==============================================================*/
create index IndexProductSupplierId on Product (
SupplierId ASC
)
go

/*==============================================================*/
/* Index: IndexProductName                                      */
/*==============================================================*/
create index IndexProductName on Product (
ProductName ASC
)
go

/*==============================================================*/
/* Table: Supplier                                              */
/*==============================================================*/
create table Supplier (
   Id                   int                  identity,
   CompanyName          nvarchar(40)         not null,
   ContactName          nvarchar(50)         null,
   ContactTitle         nvarchar(40)         null,
   City                 nvarchar(40)         null,
   Country              nvarchar(40)         null,
   Phone                nvarchar(30)         null,
   Fax                  nvarchar(30)         null,
   constraint PK_SUPPLIER primary key (Id)
)
go

/*==============================================================*/
/* Index: IndexSupplierName                                     */
/*==============================================================*/
create index IndexSupplierName on Supplier (
CompanyName ASC
)
go

/*==============================================================*/
/* Index: IndexSupplierCountry                                  */
/*==============================================================*/
create index IndexSupplierCountry on Supplier (
Country ASC
)
go

alter table "Order"
   add constraint FK_ORDER_REFERENCE_CUSTOMER foreign key (CustomerId)
      references Customer (Id)
go

alter table OrderItem
   add constraint FK_ORDERITE_REFERENCE_ORDER foreign key (OrderId)
      references "Order" (Id)
go

alter table OrderItem
   add constraint FK_ORDERITE_REFERENCE_PRODUCT foreign key (ProductId)
      references Product (Id)
go

alter table Product
   add constraint FK_PRODUCT_REFERENCE_SUPPLIER foreign key (SupplierId)
      references Supplier (Id)
go
alter table Product
   add constraint FK_PRODUCT_REFERENCE_ALT_SUPPLIER foreign key (AltSupplierId)
      references Supplier (Id)
go
