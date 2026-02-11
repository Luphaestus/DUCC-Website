
-- Ensure the database exists
CREATE DATABASE IF NOT EXISTS ducc_website;

-- Create the user if it doesn't exist, and grant privileges
-- Using '%' for host to allow connections from any Docker network IP
CREATE USER IF NOT EXISTS 'ducc_user'@'%' IDENTIFIED BY 'ducc_password';
GRANT ALL PRIVILEGES ON ducc_website.* TO 'ducc_user'@'%';

-- This is crucial: Flush privileges to apply changes immediately
FLUSH PRIVILEGES;
