DROP SCHEMA public cascade;
CREATE SCHEMA IF NOT EXISTS public;

/*
  Extension that generate id
*/
CREATE SEQUENCE global_id_sequence;

CREATE OR REPLACE FUNCTION public.id_generator(OUT result bigint) AS $$
DECLARE
    our_epoch bigint := 1314220021721;
    seq_id bigint;
    now_millis bigint;
    shard_id int := 1;
BEGIN
    SELECT nextval('global_id_sequence') % 1024 INTO seq_id;

    SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
    result := (now_millis - our_epoch) << 23;
    result := result | (shard_id << 10);
    result := result | (seq_id);
END;
$$ LANGUAGE PLPGSQL;

CREATE TABLE IF NOT EXISTS customer (
  customer_id BIGINT PRIMARY KEY DEFAULT id_generator(),
  first_name VARCHAR DEFAULT NULL,
  last_name VARCHAR DEFAULT NULL,
  email VARCHAR DEFAULT NULL,
  dob DATE DEFAULT NULL,
  phone_no VARCHAR NOT NULL,
  address_line_1 VARCHAR DEFAULT NULL,
  address_line_2 VARCHAR DEFAULT NULL,
  address_line_3 VARCHAR DEFAULT NULL,
  postal_code VARCHAR DEFAULT NULL,
  city VARCHAR DEFAULT NULL,
  state VARCHAR DEFAULT NULL,
  country VARCHAR DEFAULT NULL,
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product (
  product_id BIGINT PRIMARY KEY DEFAULT id_generator(),
  product_code VARCHAR NOT NULL,
  name VARCHAR DEFAULT NULL,
  price NUMERIC(12, 2) DEFAULT '0.00',
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_code)
);

CREATE TABLE IF NOT EXISTS order_detail (
  order_detail_id BIGINT PRIMARY KEY DEFAULT id_generator(),
  order_no VARCHAR NOT NULL,
  customer_id BIGINT DEFAULT NULL REFERENCES customer (customer_id),
  discount_amount NUMERIC(12, 2) DEFAULT '0.00',
  amount NUMERIC(12, 2) DEFAULT '0.00',
  tax_amount NUMERIC(12, 2) DEFAULT '0.00',
  status VARCHAR DEFAULT NULL -- Created, Confirmed, Delivered, Cancelled
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_no)
);

CREATE TABLE IF NOT EXISTS order_line_item (
  order_line_item_id BIGINT PRIMARY KEY DEFAULT id_generator(),
  order_detail_id BIGINT NOT NULL REFERENCES order_detail (order_detail_id),
  product_id BIGINT NULL REFERENCES product (product_id),
  quantity SMALLINT DEFAULT 1,
  unit_price NUMERIC(12, 2) DEFAULT '0.00',
  price NUMERIC(12, 2) DEFAULT '0.00',
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_payment (
  order_payment_id BIGINT PRIMARY KEY DEFAULT id_generator(),
  order_detail_id BIGINT NOT NULL REFERENCES order_detail (order_detail_id),
  receipt_no VARCHAR NOT NULL,
  transaction_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR DEFAULT NULL,
  payment_reference VARCHAR DEFAULT NULL,
  amount_paid NUMERIC(12, 2) DEFAULT '0.00',
  created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);