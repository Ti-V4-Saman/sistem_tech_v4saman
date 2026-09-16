CREATE TABLE IF NOT EXISTS sa_tools_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL,
    tool_link VARCHAR(1024),
    login VARCHAR(255),
    password_encrypted TEXT,
    auth_details TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sa_financial_control (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    monthly_cost DECIMAL(10, 2),
    plan_details VARCHAR(255),
    renewal_date DATE,
    due_date INT, -- day of month
    payment_method VARCHAR(255),
    invoice_info TEXT,
    user_access VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sa_access_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(255) NOT NULL,
    link VARCHAR(1024),
    username VARCHAR(255),
    password_encrypted TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
