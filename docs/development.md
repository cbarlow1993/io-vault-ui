# Development Guide

## Overview

This guide provides instructions for setting up a local development environment and contributing to the io-vault-multi-chain-be project.

## Repository Structure

```
io-vault-multi-chain-be/
├── .github/workflows/          # GitHub Actions CI/CD workflows
├── docs/                       # Project documentation
├── envs/                       # Environment configuration files
├── node_modules/               # Root dependencies
├── services/                   # Monorepo services
│   ├── common.ts              # Shared Serverless configuration
│   ├── core/                  # Core service
│   │   ├── src/
│   │   │   ├── handlers/      # Lambda function handlers
│   │   │   ├── lib/           # Shared libraries
│   │   │   ├── services/      # Business logic services
│   │   │   └── types/         # TypeScript type definitions
│   │   ├── resources/         # Infrastructure definitions
│   │   │   ├── functions.ts   # Lambda function configs
│   │   │   ├── tables/        # DynamoDB table definitions
│   │   │   ├── step-functions/ # Step Function state machines
│   │   │   ├── pipes/         # EventBridge Pipes
│   │   │   └── sqs/           # SQS queue definitions
│   │   ├── tests/             # Tests
│   │   │   ├── unit/          # Unit tests
│   │   │   ├── integration/   # Integration tests
│   │   │   └── e2e/           # End-to-end tests
│   │   ├── serverless.ts      # Serverless Framework config
│   │   ├── package.json       # Core service dependencies
│   │   └── README.md          # Core service documentation
│   └── rules/                 # Rules service
│       ├── src/
│       │   ├── db/            # Database models and queries
│       │   ├── handlers/      # Lambda function handlers
│       │   ├── lib/           # Shared libraries
│       │   ├── services/      # Business logic services
│       │   └── types/         # TypeScript type definitions
│       ├── resources/         # Infrastructure definitions
│       ├── tests/             # Tests
│       ├── serverless.ts      # Serverless Framework config
│       └── package.json       # Rules service dependencies
├── utils/                     # Shared utilities
├── biome.json                 # Biome configuration
├── package.json               # Root package.json (workspaces)
├── serverless-compose.ts      # Serverless Compose config
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Project README
```

## Prerequisites

### Required Software

- **Node.js**: v22.x (use nvm or asdf for version management)
- **npm**: v11.3.0 or higher
- **AWS CLI**: v2.x (for local deployment and testing)
- **Git**: v2.x

### Optional Tools

- **Docker**: For local database/service emulation
- **Postman**: For API testing (import `collection.json`)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/IoFinnet/io-vault-multi-chain-be.git
cd io-vault-multi-chain-be
```

### 2. Install Dependencies

The project uses npm workspaces for monorepo management:

```bash
# Install all dependencies (root + all services)
npm install
```

This will install dependencies for:
- Root workspace
- `services/core`
- `services/rules`

### 3. Configure Environment Variables

Create environment configuration files:

```bash
# Copy example environment files
cp envs/.env.dev.test.example envs/.env.dev.test
cp envs/.env.staging.test.example envs/.env.staging.test
```

Edit the files with appropriate values for your environment.

### 4. Set Up AWS Credentials

Configure AWS CLI with your development credentials:

```bash
aws configure --profile io-vault-dev
```

Set the following:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `eu-west-1`
- Default output format: `json`

### 5. Configure IDE (VS Code Recommended)

#### Install Extensions

1. **Biome** (official Biome extension)
   - Open Extensions (Ctrl+Shift+X)
   - Search for "Biome"
   - Install the official extension

2. **Optional Extensions**:
   - ESLint (for legacy projects)
   - GitLens
   - AWS Toolkit

#### VS Code Settings

The repository includes `.vscode/settings.json` with:
- Biome as default formatter
- Format on save enabled
- Auto-fix on save

## Development Workflow

### Code Formatting

The project uses **Biome** for linting and formatting.

#### Automatic Formatting

Biome is configured to format on save automatically.

#### Manual Formatting

```bash
# Format all files
npm run format

# Lint all files
npm run lint
```

### Running Tests

#### Unit Tests

Run unit tests for all services:

```bash
# All services
npm run test:unit

# Core service only
npm run test:core

# Rules service only
npm run test:rules
```

Run unit tests for a specific service:

```bash
# Core service
cd services/core
npm run test:unit

# Rules service
cd services/rules
npm run test:unit
```

#### Integration Tests

Integration tests require access to AWS resources (DynamoDB, RDS, etc.).

```bash
# All integration tests
npm run test:integration

# Core service integration tests
cd services/core
npm run test:integration

# Specific test suites
npm run test:integration:addresses
npm run test:integration:balances
npm run test:integration:transactions
```

**Note**: Integration tests may require VPN connection or AWS credentials.

#### E2E Tests

```bash
# Core service E2E tests
cd services/core
npm run test:e2e
```

### Working with Services

#### Core Service

**Key Directories**:
- `handlers/`: Lambda function entry points
- `services/`: Business logic (addresses, transactions, balances, etc.)
- `lib/`: Shared utilities (DynamoDB client, validation, etc.)
- `resources/`: Infrastructure as Code definitions

**Common Tasks**:

1. **Add a new API endpoint**:
   - Create handler in `src/handlers/<domain>/<action>.ts`
   - Add function definition in `resources/functions.ts`
   - Update OpenAPI schema in handler using Zod
   - Add unit tests in `tests/unit/handlers/<domain>/`
   - Add integration tests in `tests/integration/<domain>/`

2. **Add a new DynamoDB table**:
   - Create table definition in `resources/tables/<table-name>.ts`
   - Add table to `serverless.ts` resources
   - Create service layer in `src/services/<domain>/`

3. **Add a new Step Function**:
   - Create state machine definition in `resources/step-functions/state-machines/<name>.sm.ts`
   - Create IAM role in `resources/step-functions/roles/<name>.role.ts`
   - Add to `resources/step-functions/index.ts`

#### Rules Service

**Key Directories**:
- `handlers/`: Lambda function entry points
- `services/`: Business logic (rules, executions, sweeps)
- `db/`: Database models and queries
- `resources/`: Infrastructure as Code definitions

**Common Tasks**:

1. **Add a new rule condition**:
   - Update rule schema in `src/types/rule.ts`
   - Modify rule evaluation in `src/services/rule-engine.ts`
   - Add unit tests for new condition

2. **Modify sweep logic**:
   - Update `src/services/sweep-candidates.ts`
   - Modify Step Function in `resources/step-functions/post-transaction-sweep/`
   - Add integration tests

### Local Development

#### Invoke Lambda Locally

Use Serverless Framework to invoke functions locally:

```bash
# Invoke a function locally
serverless invoke local --function <function-name> --data '{"key": "value"}'

# Example: Invoke getAddress function
cd services/core
serverless invoke local --function getAddress --data '{"pathParameters": {"address": "0x123", "chain": "ETH"}}'
```

#### Local DynamoDB

Use DynamoDB Local for offline development:

```bash
# Install DynamoDB Local plugin
npm install --save-dev serverless-dynamodb-local

# Start DynamoDB Local
serverless dynamodb start
```

#### Local Step Functions

Use Step Functions Local for testing state machines:

```bash
# Install Step Functions Local plugin
npm install --save-dev serverless-step-functions-local

# Start Step Functions Local
serverless stepfunctions start
```

### Debugging

#### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Lambda Function",
      "program": "${workspaceFolder}/node_modules/.bin/serverless",
      "args": [
        "invoke",
        "local",
        "--function",
        "<function-name>",
        "--data",
        "{}"
      ],
      "cwd": "${workspaceFolder}/services/core"
    }
  ]
}
```

#### CloudWatch Logs

Tail logs from deployed functions:

```bash
# Tail logs for a specific function
serverless logs --function <function-name> --stage dev --tail

# View logs for a specific time range
serverless logs --function <function-name> --stage dev --startTime 1h
```

### Working with OpenAPI

#### Generate OpenAPI Specification

```bash
# Generate OpenAPI for all services
npm run generate-openapi

# Generate OpenAPI for Core service only
npm run generate-openapi:core
```

Output: `services/core/openapi.json`

#### Generate Postman Collection

```bash
# Generate Postman collection for all services
npm run generate-postman

# Generate Postman collection for Core service only
npm run generate-postman:core
```

Output: `services/core/collection.json`

Import this file into Postman to test API endpoints.

## Common Development Tasks

### Adding a New Blockchain Chain

1. **Update chains configuration**:
   - Add chain to `@iofinnet/io-core-dapp-utils-chains-config`
   - Add chain-specific logic in `services/core/src/services/<chain-name>/`

2. **Add address validation**:
   - Update `src/lib/address-validation.ts`

3. **Add transaction building**:
   - Create handler in `src/handlers/transactions/build-transaction/<chain-name>-handler.ts`

4. **Add tests**:
   - Unit tests in `tests/unit/handlers/transactions/build-transaction/`
   - Integration tests in `tests/integration/chains/`

### Adding a New External Integration

1. **Add dependency**:
   ```bash
   npm install <package> --workspace=@io-vault-multi-be/core
   ```

2. **Create service wrapper**:
   - Add service in `src/services/<integration-name>.ts`
   - Add API client configuration

3. **Add environment variables**:
   - Update `serverless.ts` params
   - Add secrets to AWS Secrets Manager

4. **Add tests**:
   - Mock external API in unit tests
   - Use VCR pattern for integration tests

### Modifying a Rule Condition

1. **Update rule schema**:
   ```typescript
   // src/types/rule.ts
   export const ruleConditionSchema = z.object({
     // Add new condition type
   });
   ```

2. **Update rule engine**:
   ```typescript
   // src/services/rule-engine.ts
   export async function evaluateRule(rule: Rule, transaction: Transaction) {
     // Add new condition evaluation logic
   }
   ```

3. **Add tests**:
   ```typescript
   // tests/unit/services/rule-engine.test.ts
   describe('New rule condition', () => {
     it('should evaluate correctly', () => {
       // Test new condition
     });
   });
   ```

## Database Development

### PostgreSQL Schema

The PostgreSQL schema is managed via migrations in `@iofinnet/io-vault-db-sdk`.

#### Running Migrations

```bash
# Run migrations for dev environment
npm run migrate:dev

# Run migrations for staging
npm run migrate:staging
```

### DynamoDB Local Development

Use AWS NoSQL Workbench to design and test DynamoDB queries:

1. Download AWS NoSQL Workbench
2. Import table definitions from `resources/tables/`
3. Test query patterns with sample data

## Testing Strategy

### Unit Tests

- **Scope**: Individual functions, services, and utilities
- **Mocking**: Mock all external dependencies (AWS SDK, HTTP clients)
- **Coverage Target**: >80%

**Example**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { getAddress } from './get-address';

vi.mock('@aws-sdk/client-dynamodb');

describe('getAddress', () => {
  it('should return address when found', async () => {
    // Test implementation
  });
});
```

### Integration Tests

- **Scope**: End-to-end flows within a service
- **Dependencies**: Real AWS services (DynamoDB, RDS, Step Functions)
- **Isolation**: Use test tables/databases

**Setup**:
```typescript
// tests/integration/setup.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamoClient = new DynamoDBClient({ region: 'eu-west-1' });
export const testTableName = 'test-addresses-table';
```

### E2E Tests

- **Scope**: Multi-service workflows
- **Environment**: Staging or dedicated E2E environment
- **Automation**: Run as part of deployment pipeline

## Code Style Guide

### TypeScript

- Use strict mode
- Prefer `type` over `interface` for simple types
- Use `interface` for extensible objects
- Avoid `any`; use `unknown` when type is truly unknown

### Naming Conventions

- **Files**: kebab-case (`get-address.ts`)
- **Functions**: camelCase (`getAddress`)
- **Types**: PascalCase (`AddressResponse`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase (`IAddressService` or `AddressService`)

### Import Organization

Organize imports in the following order:

1. Node.js built-ins
2. External packages
3. Internal packages (`@iofinnet/*`)
4. Parent directory imports (`../`)
5. Sibling directory imports (`./`)

**Example**:
```typescript
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { logger } from '@iofinnet/powertools';
import { validateAddress } from '../lib/validation';
import { getAddressById } from './address-repository';
```

### Error Handling

Use custom error classes from `@iofinnet/errors-sdk`:

```typescript
import { NotFoundError, ValidationError } from '@iofinnet/errors-sdk';

if (!address) {
  throw new NotFoundError('Address not found');
}

if (!isValidAddress(address)) {
  throw new ValidationError('Invalid address format');
}
```

### Logging

Use AWS Lambda Powertools Logger:

```typescript
import { logger } from '@iofinnet/powertools';

logger.info('Processing address', { address, chain });
logger.error('Failed to fetch address', { error, address });
```

## Git Workflow

### Branching Strategy

- `master`: Production-ready code
- `feat/<feature-name>`: New features
- `fix/<bug-name>`: Bug fixes
- `chore/<task-name>`: Maintenance tasks

### Commit Messages

Follow Conventional Commits:

- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring

**Example**:
```
feat: add support for Solana address validation

- Implement Solana address validation using bs58
- Add unit tests for Solana addresses
- Update API documentation
```

### Pull Request Process

1. Create feature branch from `master`
2. Implement changes with tests
3. Run linter and tests locally
4. Push branch and create PR
5. Address review comments
6. Merge after approval (squash and merge)

## Troubleshooting

### Common Issues

#### 1. `npm install` fails

**Symptom**: Dependency installation errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
rm -rf services/*/node_modules

# Reinstall
npm install
```

#### 2. TypeScript compilation errors

**Symptom**: Type errors in IDE

**Solution**:
```bash
# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Rebuild TypeScript project
npx tsc --build --force
```

#### 3. Tests fail with AWS errors

**Symptom**: Integration tests fail with authentication errors

**Solution**:
- Verify AWS credentials: `aws sts get-caller-identity --profile io-vault-dev`
- Check environment variables in test files
- Ensure VPN connection for database access

#### 4. Serverless deployment fails

**Symptom**: CloudFormation stack update errors

**Solution**:
```bash
# View stack events
aws cloudformation describe-stack-events --stack-name <stack-name>

# Force re-deployment
serverless deploy --force --stage dev

# Deploy with verbose logging
serverless deploy --verbose --stage dev
```

## Best Practices

### Performance

- Use DynamoDB batch operations for multiple items
- Implement pagination for large result sets
- Use DynamoDB TTL for automatic data expiration
- Cache frequently accessed data (token metadata)

### Security

- Never commit secrets or API keys
- Use AWS Secrets Manager for sensitive data
- Validate all user inputs with Zod schemas
- Implement least-privilege IAM policies

### Scalability

- Design for stateless Lambda functions
- Use SQS for buffering high-volume requests
- Implement idempotency for critical operations
- Use Step Functions for long-running workflows

### Maintainability

- Write comprehensive unit tests
- Document complex business logic
- Use meaningful variable names
- Keep functions small and focused

## Resources

### Documentation

- [Serverless Framework](https://www.serverless.com/framework/docs)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/)

### Internal Resources

- Platform API Documentation: `https://docs.platform.iofinnet.com`
- Confluence: Team documentation and runbooks
- Slack Channels:
  - `#vault-dev`: Development discussions
  - `#dv2-e2e-alerts`: E2E test notifications
  - `#platform-support`: Platform integration support

### Useful Commands

```bash
# View all npm scripts
npm run

# Check Serverless configuration
serverless print --stage dev

# View CloudFormation template
serverless package --stage dev
cat .serverless/cloudformation-template-update-stack.json

# Invoke Step Function
aws stepfunctions start-execution \
  --state-machine-arn <arn> \
  --input '{"key": "value"}'

# Query DynamoDB table
aws dynamodb scan --table-name <table-name> --limit 10
```

## Getting Help

- Check existing documentation in `/docs`
- Review service README files
- Search Confluence for runbooks
- Ask in Slack `#vault-dev`
- Create GitHub issue for bugs or feature requests
