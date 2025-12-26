-- KIGALI MALL INVENTORY MANAGEMENT SYSTEM
-- Complete Database Setup Script
-- Run this in phpMyAdmin

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS stock_adjustments, inventory, stock_out, stock_in, items, suppliers, categories, users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS TABLE (Authentication & OTP)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'staff') DEFAULT 'staff',
    otp_code VARCHAR(6),
    otp_expiry DATETIME,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 3. SUPPLIERS TABLE
CREATE TABLE suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL,
    contact_info TEXT,
    phone VARCHAR(50)
);

-- 4. ITEMS TABLE
CREATE TABLE items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    item_name VARCHAR(100) NOT NULL,
    category_id INT,
    unit VARCHAR(20),
    reorder_level INT DEFAULT 10,
    selling_price DECIMAL(15,2),
    buying_price DECIMAL(15,2),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- 5. STOCK_IN TABLE (Incoming Stock)
CREATE TABLE stock_in (
    stock_in_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT,
    supplier_id INT,
    quantity INT NOT NULL,
    received_by INT,
    stock_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(50),
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (received_by) REFERENCES users(user_id)
);

-- 6. STOCK_OUT TABLE (Sales/Outgoing Stock with EBM)
CREATE TABLE stock_out (
    stock_out_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT,
    quantity INT NOT NULL,
    ebm_signature VARCHAR(255),
    reason ENUM('sale', 'damage', 'transfer') DEFAULT 'sale',
    issued_by INT,
    stock_out_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(50),
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (issued_by) REFERENCES users(user_id)
);

-- 7. INVENTORY TABLE (Current Stock Balance)
CREATE TABLE inventory (
    inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT UNIQUE,
    current_quantity INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- 8. STOCK_ADJUSTMENTS TABLE (Damage/Corrections)
CREATE TABLE stock_adjustments (
    adjustment_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT,
    quantity_change INT, -- Positive for found stock, Negative for damage/loss
    reason VARCHAR(255),
    adjusted_by INT,
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id),
    FOREIGN KEY (adjusted_by) REFERENCES users(user_id)
);

-- SEED DATA
-- Admin User (Password: admin123)
INSERT INTO users (username, password, full_name, role) 
VALUES ('admin', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'System Administrator', 'admin');

-- Categories
INSERT INTO categories (category_name, description) VALUES 
('Beverages', 'Drinks and liquids'),
('Electronics', 'Electronic devices and gadgets'),
('Groceries', 'Food items and daily essentials'),
('Personal Care', 'Health and beauty products');

-- Suppliers
INSERT INTO suppliers (supplier_name, contact_info, phone) VALUES 
('Inyange Industries', 'Kigali, Rwanda', '+250780000001'),
('Kigali Tech Hub', 'Kigali, Rwanda', '+250780000002'),
('Rwanda Food Suppliers', 'Kigali, Rwanda', '+250780000003');

-- Sample Items
INSERT INTO items (item_name, category_id, unit, selling_price, buying_price, reorder_level) VALUES 
('Inyange Milk 1L', 1, 'pcs', 1200.00, 1000.00, 20),
('Smartphone X1', 2, 'pcs', 150000.00, 130000.00, 5),
('Basmati Rice 5kg', 3, 'bag', 8500.00, 7000.00, 10),
('Body Soap', 4, 'pcs', 800.00, 600.00, 50);

-- Initial Inventory
INSERT INTO inventory (item_id, current_quantity) VALUES 
(1, 100),
(2, 20),
(3, 50),
(4, 200);

