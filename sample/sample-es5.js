var Sequelize = require("sequelize");
var initModels = require("./models/init-models").initModels; 
var config = require("./config");

// create sequelize instance with database connection
var sequelize = new Sequelize(config.dbname, config.user, config.pass, config.options);

// load the model definitions into sequelize
console.log(initModels);
var models = initModels(sequelize);

var Customer = models.Customer;
var Order = models.Order;

// get a customer using known values in the sample data
return Customer.findOne({ where: { "firstName": "Hanna", "lastName": "Moos" }, include: [{model: Order, as: "orders"}] }).then(cust => {
  console.log(cust);
  if (cust == null) {
    return;
  }
  var promises = [];

  return Order.findOne({ where: { orderNumber: "542639"}, include: ["customer"]}).then(ord => {
    console.log(ord);

    // make pseudo-incremental order number for demo
    var millis = new Date().getTime().toString();
    var orderNumber = "55" + millis.substring(6, 10);

    // create a new Order for the customer
    var attr = {
      customerId: cust.id,
      orderDate: new Date(),
      orderNumber: orderNumber,
      totalAmount: 223.45,
      status: 'PROCESSING'
    };

    return Order.create(attr).then(order => {
      // display list of orders
      return Order.findAll({ where: { "customerId": cust.id }}).then(rows => {
        rows.forEach(r => console.log(r.orderNumber + " " + r.totalAmount));
      });
    });
  });

}).catch(err => console.error(err)).finally(() => {
  sequelize.close();
});
