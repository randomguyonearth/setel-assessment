const Joi = require("joi");
const payment = require("./payment");

module.exports.register = server => {
  server.route([
    {
      method: "POST",
      path: "/payment",
      handler: payment.makePayment,
      config: {
        description: "Make Payment",
        validate: {
          payload: {
            nounce: Joi.string().required(),
            paymentAmount: Joi.number()
              .min(0)
              .max(9999999999.99)
              .required()
          }
        }
      }
    }
  ]);
};

module.exports.register.attributes = {
  name: "routes-payment"
};
