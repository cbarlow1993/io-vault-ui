# io-vault Multi-Chain Backend

A Fastify-based API service for multi-chain vault management.

## Requirements

- Node.js 22+
- Docker & Docker Compose (for local development)
- PostgreSQL 16+

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL with Docker:**
   ```bash
   npm run docker:up
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate:up
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run start` | Start production server |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Lint code with Biome |
| `npm run format` | Format code with Biome |
| `npm run migrate:up` | Run database migrations |
| `npm run migrate:down` | Rollback database migrations |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |

## Project Structure

```
├── src/
│   ├── app.ts              # Fastify app factory
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   ├── lib/                # Utilities and database
│   │   ├── config.ts       # Environment configuration
│   │   ├── chains.ts       # Chain definitions
│   │   └── database/       # Kysely database setup
│   ├── plugins/            # Fastify plugins
│   ├── repositories/       # Data access layer
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   └── types/              # TypeScript types
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── utils/              # Test utilities
├── scripts/                # Utility scripts
├── docker-compose.yml      # Docker configuration
├── Dockerfile              # Container build
└── package.json
```

## API Documentation

When the server is running, Swagger documentation is available at:
- `http://localhost:3000/docs`

## API Endpoints

- `GET /health` - Health check
- `GET /v2/chains` - List supported chains (public)
- `POST /v2/vaults/:vaultId/addresses` - Create address
- `GET /v2/balances` - Get balances
- `GET /v2/transactions` - List transactions
- `GET /v2/transactions/:hash` - Get transaction by hash
- `POST /v2/reconciliation` - Start reconciliation job
- `GET /v2/spam/tokens/:tokenId/classification` - Get token spam classification

## Docker Deployment

Build and run with Docker:

```bash
docker build -t io-vault-multi-chain-be .
docker run -p 3000:3000 --env-file .env io-vault-multi-chain-be
```

Or use Docker Compose for the full stack:

```bash
docker-compose up
```

## License

Proprietary - iofinnet
