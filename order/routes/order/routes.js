const Joi = require("joi");
const order = require("./order");

module.exports.register = server => {
  server.route([
    {
      method: "GET",
      path: "/orders",
      handler: order.getOrders,
      config: {
        description: "Get Orders",
        validate: {
          query: {
            id: Joi.string()
              .optional()
              .allow("")
          }
        }
      }
    },
    {
      method: "POST",
      path: "/order",
      handler: order.insertOrder,
      config: {
        description: "Insert Order",
        validate: {
          payload: {
            // orderNo: Joi.string().required(),
            customerId: Joi.string().optional(),
            discountAmount: Joi.number()
              .min(0)
              .max(9999999999.99)
              .required(),
            taxAmount: Joi.number()
              .min(0)
              .max(9999999999.99)
              .required(),
            lineItems: Joi.array().items(
              Joi.object({
                productId: Joi.string().required(),
                quantity: Joi.number()
                  .min(0)
                  .max(9999999999)
                  .required(),
                unitPrice: Joi.number()
                  .min(0)
                  .max(9999999999.99)
                  .required(),
                price: Joi.number()
                  .min(0)
                  .max(9999999999.99)
                  .required(),
                nounce: Joi.string().required()
              })
            )
          }
        }
      }
    },
    {
      method: "POST",
      path: "/voidorder",
      handler: order.voidOrder,
      config: {
        description: "Void Order",
        validate: {
          payload: {
            id: Joi.string().required()
          }
        }
      }
    }
  ]);
};

module.exports.register.attributes = {
  name: "routes-order"
};
