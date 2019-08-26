const axios = require("axios");
const escape = require("pg-escape");

const CREATED = "Created";
const CONFIRMED = "Confirmed";
const CANCELLED = "Cancelled";
const DELIVERED = "Delivered";

module.exports.getOrders = async (request, reply) => {
  const { id } = request.query;
  let filters = "";
  if (id) {
    filters += escape("AND order_detail_id = %L", id);
  }
  const SQL_QUERY = escape(
    `
      SELECT * ,
      (
          SELECT ROW_TO_JSON(customer.*) AS customer FROM (
            SELECT
              TRIM(to_char(customer_id, '9999999999999999999')) AS customer_id,
              first_name, last_name, email, phone_no, address_line_1, 
              address_line_2, address_line_3, postal_code, state, country
            FROM customer
            WHERE customer_id = order_detail.customer_id
          ) AS customer
        ) AS customer,
      (
          SELECT COALESCE(JSON_AGG(line_items.*), '[]'::JSON) AS line_items FROM (
            SELECT
              TRIM(to_char(oli.order_line_item_id, '9999999999999999999')) AS order_line_item,
              TRIM(to_char(oli.order_detail_id, '9999999999999999999')) AS order_detail_id,
              oli.quantity, oli.unit_price, oli.price,
              TRIM(to_char(p.product_id, '9999999999999999999')) AS product_id,
              p.product_code, p.name
            FROM order_line_item oli
            INNER JOIN product p ON p.product_id = oli.product_id
            WHERE oli.order_detail_id = order_detail.order_detail_id
          ) AS line_items
        ) AS line_items,
        (
          SELECT COALESCE(JSON_AGG(payment.*), '[]'::JSON) AS payment FROM (
            SELECT
              TRIM(to_char(order_payment_id, '9999999999999999999')) AS order_payment_id,
              TRIM(to_char(order_detail_id, '9999999999999999999')) AS order_detail_id,
              transaction_dt, payment_method,
              payment_reference, amount_paid, receipt_no
            FROM order_payment
            WHERE order_detail_id = order_detail.order_detail_id AND status IN (%s)
            ORDER BY transaction_dt DESC
          ) AS payment
        ) AS payment
        FROM order_detail WHERE active = TRUE %s`,
    [CREATED, CONFIRMED, DELIVERED].join(","),
    filters
  );
  const result = await request.pg.client.query(SQL_QUERY);
  return reply({ data: result.rows });
};

module.exports.insertOrder = async (request, reply) => {
  const {
    orderNo,
    customerId,
    discountAmount,
    amount,
    taxAmount,
    lineItems,
    nounce
  } = request.payload;
  let SQL_QUERY = escape(
    `
    INSERT INTO order_detail (
      order_no, customer_id, discount_amount, amount, tax_amount, status
    ) VALUES (%L, %L, %s, %s, %s, %L) RETURNING order_detail_id
  `,
    orderNo,
    customerId,
    discountAmount,
    amount,
    taxAmount,
    CREATED
  );
  const result = await request.pg.client.query(SQL_QUERY);
  for (const lineItem of lineItems) {
    const { productId, quantity, unitPrice, price } = lineItem;
    const LINE_ITEM_QUERY = escape(
      `
      INSERT INTO order_line_item (
        order_detail_id, product_id, quantity, unit_price, price)
        VALUES (%L, %L, %s, %s, %s)
    `,
      result.rows[0].order_detail_id,
      productId,
      quantity,
      unitPrice,
      price
    );
    const result = await request.pg.client.query(LINE_ITEM_QUERY);
  }
  // Make Payment
  const paymentResult = axios.post(`${ process.env.PAYMENT_HOST }/payment`, {
    nounce,
    paymentAmount: lineItems
      .map(({ price }) => price)
      .reduce((a, b) => a + b, 0)
  });
  if (paymentResult.data && paymentResult.data.isSuccess) {
    let PAYMENT_QUERY = `
      SELECT COUNT(1) + 1 AS new_receipt_no, TO_CHAR(NOW()::TIMESTAMP AT TIME ZONE 'UTC', 'YYMMDD') AS today_date
      FROM order_payment
      WHERE TO_CHAR(created_dt::TIMESTAMP AT TIME ZONE 'UTC', 'YYMMDD') = TO_CHAR(NOW()::TIMESTAMP AT TIME ZONE 'UTC', 'YYMMDD');`;
    let newReceiptResult = await request.pg.client.query(PAYMENT_QUERY);
    const receiptCount = newReceiptResult.rows[0].new_receipt_no;
    const todayDate = newReceiptResult.rows[0].today_date;
    const receiptNo = todayDate + leftPads(receiptCount.toString(), 2);
    PAYMENT_QUERY = escape(
      `
        INSERT INTO order_payment (order_detail_id, receipt_no, payment_method, payment_reference, amount_paid) VALUES(
            %L, %L, %L, %L, %s);
    `,
      result.rows[0].order_detail_id,
      receiptNo,
      paymentResult.data.paymentMethod,
      paymentResult.data.paymentReference,
      paymentResult.data.paymentAmount
    );
    await request.pg.client.query(SQL_QUERY);
    await updateOrderStatus(request, result.rows[0].order_detail_id, CONFIRMED);
    // Set Order to Deliver State 5 seconds later
    setTimeout(() => {
      updateOrderStatus(request, result.rows[0].order_detail_id, DELIVERED);
    }, 5000);
  } else {
    // Cancel Order
    await updateOrderStatus(request, result.rows[0].order_detail_id, CANCELLED);
  }
  return reply({ data: result.rows[0].order_detail_id });
};

module.exports.voidOrder = async (request, reply) => {
  const { id } = request.payload;
  const result = await updateOrderStatus(request, id, CANCELLED);
  return reply({ data: result.rows[0].order_detail_id });
};

const updateOrderStatus = async (request, id, status) => {
  const SQL_QUERY = escape(
    `
    UPDATE order_detail
    SET status = %L
    WHERE order_detail_id = %L
    RETURNING order_detail_id;
  `,
    status,
    id
  );
  return await request.pg.client.query(SQL_QUERY);
};

const leftPads = (str, len) => {
  while (str.length < len) {
    str = "0" + str;
  }
  return str;
};
