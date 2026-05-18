-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  full_name  VARCHAR(150),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Default admin account (username: admin, password: Admin2024)
INSERT INTO admin_users (username, password, full_name)
VALUES ('admin', 'Admin2024', 'Hi-Fi Admin')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS students (
  id                SERIAL PRIMARY KEY,
  location          VARCHAR(50)   NOT NULL DEFAULT 'Tumkur',
  pg_type           VARCHAR(10)   NOT NULL,
  name              VARCHAR(150)  NOT NULL,
  phone             VARCHAR(15)   NOT NULL,
  address           TEXT          NOT NULL,
  room_number       VARCHAR(20)   NOT NULL,
  joining_date      VARCHAR(20)   NOT NULL,
  duration          INTEGER       NOT NULL,
  rent              NUMERIC(10,2) NOT NULL,
  advance           NUMERIC(10,2) DEFAULT 0,
  advance_return    NUMERIC(10,2) DEFAULT 0,
  rent_paid         NUMERIC(10,2) DEFAULT 0,
  rent_remainder    NUMERIC(10,2) DEFAULT 0,
  outstanding       NUMERIC(10,2) DEFAULT 0,
  total_outstanding NUMERIC(10,2) DEFAULT 0,
  id_proof_name     VARCHAR(255),
  id_proof_type     VARCHAR(100),
  id_proof_data     TEXT,
  admitted_on       VARCHAR(30),
  created_at        TIMESTAMP DEFAULT NOW()
);
