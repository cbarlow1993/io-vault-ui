-- Initial database setup for io-vault-multi-chain-be
-- This script runs when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions (for development)
GRANT ALL PRIVILEGES ON DATABASE io_vault TO postgres;
