import { Sequelize } from "sequelize";
import config from "./config";
import { initModels, Order, OrderAttributes, OrderCreationAttributes } from "./models/init-models";

class SampleApp {
  sequelize: Sequelize;
  constructor() {
    // create sequelize instance with database connection
    this.sequelize = new Sequelize(config.dbname, config.user, config.pass, config.options);
  }

  async run() {
    try {
      // load the model definitions into sequelize
      const { Customer, Order } = initModels(this.sequelize);

      // Customer.findAll({ where: { "country": "Germany" }}).then(rows => {
      //   console.log(rows);
      // });

      // get a customer using known values in the sample data
      const cust = await Customer.findOne({ where: { "firstName": "Hanna", "lastName": "Moos" }, include: ['orders'] });
      // console.log(cust);
      if (cust == null) {
        return;
      }

      const ord = await Order.findOne({ where: { orderNumber: "542639" } });
      // console.log(ord);
      // console.log(await ord?.getCustomer());
      // console.log(await ord?.getOrderItems().catch((err: Error) => console.error(err)));

      // make pseudo-incremental order number for demo
      const millis = new Date().getTime().toString();
      const orderNumber = "55" + millis.substring(6, 10);

      // create a new Order for the customer
      const attr: OrderCreationAttributes = {
        customerId: cust.id,
        // orderDate: new Date(),
        orderNumber: orderNumber,
        totalAmount: 223.45,
        status: 'PROCESSING'
      };

      await Order.create(attr).then((order2: Order) => {
        console.log(order2);
        // display list of orders
        return Order.findAll({ where: { "customerId": cust.id } }).then((rows: OrderAttributes[]) => {
          rows.forEach(r => console.log(r.orderNumber + " " + r.totalAmount));
        });
      });
    } finally {
      this.sequelize.close();
    }
  }
}

const app = new SampleApp();
app.run().catch(err => console.error(err));


