const _ = require("lodash");

module.exports.makePayment = async (request, reply) => {
  const { nounce, paymentAmount } = request.query;
  const paymentResult = processPayment(nounce, paymentAmount);
  return reply({ data: paymentResult });
};

const processPayment = (nounce, paymentAmount) => {
  const isSuccess = _.sample([true, false]);
  return {
    paymentMethod: "Mock Payment Method",
    paymentReference: "This is a test payment",
    paymentAmount,
    isSuccess
  };
};
