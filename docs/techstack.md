# Technology Stack

## Overview

This document provides a comprehensive inventory of all technologies, frameworks, libraries, and tools used in the io-vault-multi-chain-be project.

## Runtime & Languages

### Node.js
- **Version**: 22.x
- **Type**: ES Modules (ESM)
- **Purpose**: Runtime environment for serverless functions

### TypeScript
- **Version**: Latest (via @tsconfig/node22)
- **Configuration**: `@tsconfig/node22`
- **Purpose**: Type-safe JavaScript development
- **Build Tool**: tsx for script execution, esbuild for production builds

## Infrastructure & Cloud Services

### AWS Services

#### Compute
- **AWS Lambda**: Serverless compute for API handlers and background processing
  - Runtime: Node.js 22.x
  - Bundler: esbuild via serverless-esbuild
  - VPC integration for database access
  - Reserved concurrency configurations

#### Database
- **Amazon DynamoDB**: NoSQL database for high-performance data storage
  - Tables: Addresses, Transactions, Token Metadata (Core), Rules, Executions, Transfers (Rules)
  - On-demand capacity mode
  - Global Secondary Indexes (GSI) for query patterns
  - KMS encryption

- **Amazon RDS (PostgreSQL)**: Relational database for complex queries
  - Accessed via RDS Proxy for connection pooling
  - Multi-AZ for high availability
  - Read replicas for scalability

#### Orchestration
- **AWS Step Functions**: Workflow orchestration
  - State machines for transaction sync, enrichment, and sweep operations
  - Express and Standard workflows
  - CloudWatch Logs integration

#### Messaging & Events
- **Amazon EventBridge**: Event-driven architecture
  - Custom event bus for vault events
  - Cross-account event routing to Platform
  - EventBridge Pipes for DynamoDB Streams → Step Functions

- **Amazon SQS**: Message queuing
  - Transaction sync queue for buffering
  - Dead letter queues for error handling

#### Security & Access
- **AWS Secrets Manager**: Secure storage for credentials and API keys
  - Database connection strings
  - Third-party API keys (Noves, Tatum, Blockaid, CoinGecko)

- **AWS KMS**: Encryption key management
  - DynamoDB table encryption
  - Secrets Manager encryption

- **AWS IAM**: Identity and access management
  - Lambda execution roles
  - Step Function roles
  - Cross-account access roles

#### Networking
- **Amazon VPC**: Virtual private cloud for Lambda isolation
  - Security groups for Lambda functions
  - Private subnets for database access
  - NAT gateways for internet access

- **Amazon RDS Proxy**: Connection pooling for PostgreSQL
  - Reduces connection overhead
  - Automatic failover

#### API & Integration
- **AWS API Gateway (HTTP API)**: RESTful API endpoints
  - JWT authorization integration
  - OpenAPI 3.0 documentation

- **Lambda Function URLs**: Internal service-to-service communication
  - Used by Rules service to call Core service

## Framework & Libraries

### Serverless Framework
- **Version**: 4.x
- **Purpose**: Infrastructure as Code (IaC) for AWS deployment
- **Configuration**: TypeScript-based serverless.ts files
- **Plugins**:
  - `serverless-esbuild`: Fast bundling with esbuild
  - `serverless-step-functions`: Step Functions definition and deployment
  - `serverless-vpc-discovery`: Automatic VPC resource discovery
  - `serverless-analyze-bundle-plugin`: Bundle size analysis
  - `serverless-prune-plugin`: Automatic cleanup of old Lambda versions

### Middleware & Lambda Utils

#### Middy
- **Package**: `@middy/core`, `@middy/http-json-body-parser`, `@middy/input-output-logger`
- **Version**: ^4.0.0
- **Purpose**: Lambda middleware framework
- **Features**:
  - JSON body parsing
  - Input/output logging
  - Error handling

#### AWS Lambda Powertools
- **Packages**:
  - `@aws-lambda-powertools/logger` (v2.27.0)
  - `@aws-lambda-powertools/parser` (v2.11.0)
  - `@aws-lambda-powertools/tracer` (v2.11.0)
- **Purpose**: Structured logging, input validation, and distributed tracing
- **Features**:
  - CloudWatch Logs integration
  - X-Ray tracing
  - Log sampling

### AWS SDK v3
- **Packages**:
  - `@aws-sdk/client-dynamodb`
  - `@aws-sdk/client-eventbridge`
  - `@aws-sdk/client-sfn` (Step Functions)
  - `@aws-sdk/client-sqs`
  - `@aws-sdk/client-pipes`
  - `@aws-sdk/client-rds-data`
  - `@aws-sdk/util-dynamodb`
- **Version**: ^3.782.0+
- **Purpose**: AWS service clients for Node.js

## Blockchain & Crypto Libraries

### Multi-Chain Support

#### Bitcoin
- **Package**: `@iofinnet/bitcoinjs-lib`, `bip32`, `tiny-secp256k1`, `@bitcoinerlab/secp256k1`, `wif`
- **Purpose**: Bitcoin transaction building, address derivation, signature generation

#### Bitcoin SV
- **Package**: `@bsv/sdk`
- **Version**: ^1.5.1
- **Purpose**: Bitcoin SV transaction support

#### Ethereum & EVM Chains
- **Package**: `viem`, `ethereumjs-util`, `eip55`
- **Version**: viem ^2.30.6
- **Purpose**: Ethereum transaction building, address validation, signing
- **Features**: Multi-chain EVM support (Ethereum, Polygon, BSC, Arbitrum, etc.)

#### Ripple/XRP
- **Package**: `ripple-address-codec`, `ripple-keypairs`
- **Version**: ^5.0.0, ^2.0.0
- **Purpose**: XRP address encoding/decoding, key pair generation

#### Polkadot/Substrate
- **Package**: `@polkadot/api`
- **Version**: ^15.10.2
- **Purpose**: Polkadot and Substrate-based chain support

#### Cryptography
- **Packages**: `@noble/secp256k1`, `crypto-js`, `jose`
- **Purpose**: Elliptic curve cryptography, hashing, JWT handling

### Blockchain Data Providers

#### Noves
- **Package**: `@noves/noves-sdk`
- **Version**: 1.3.2
- **Purpose**: Transaction enrichment and human-readable descriptions

#### Tatum
- **Package**: `@tatumio/tatum`
- **Version**: ^4.2.57
- **Purpose**: Multi-chain API for transactions, balances, webhooks, and token data

#### Blockaid
- **Package**: `@blockaid/client`
- **Version**: 0.57.0
- **Purpose**: Real-time transaction security scanning and risk detection

## Data & Validation

### Schema Validation
- **Package**: `zod`
- **Version**: ^4.3.5
- **Purpose**: Runtime type validation for API inputs and outputs
- **Integration**: OpenAPI schema generation via `fastify-type-provider-zod`

### Rules Engine
- **Package**: `json-rules-engine`
- **Version**: ^7.3.1
- **Purpose**: Rule evaluation for transaction automation (Rules service)

### Data Manipulation
- **Package**: `bignumber.js`
- **Version**: ^9.1.2
- **Purpose**: Arbitrary-precision decimal and non-decimal arithmetic

## API & Communication

### HTTP Client
- **Package**: `axios`
- **Version**: ^1.12.0
- **Purpose**: HTTP requests to external APIs

### GraphQL
- **Packages**: `@apollo/client`, `graphql-request`
- **Version**: ^3.13.8, ^7.1.2
- **Purpose**: Query Platform GraphQL API for user/organization data

## Authentication & Authorization

### Permit.io
- **Package**: `permitio`
- **Version**: 2.7.2 (Core), 2.7.4 (Root)
- **Purpose**: Fine-grained access control and policy management
- **Architecture**: Policy Decision Point (PDP) for authorization decisions

### JWT
- **Package**: `jose`
- **Version**: ^6.0.10
- **Purpose**: JWT token parsing and validation

## IOFinnet Internal SDKs

### Platform SDKs
- `@iofinnet/http-sdk` (^13.24.0): HTTP utilities and error handling
- `@iofinnet/errors-sdk` (^13.24.0): Standardized error definitions
- `@iofinnet/powertools` (^13.24.0): Shared Lambda utilities
- `@iofinnet/biome` (^13.24.0): Code quality configuration

### Vault SDKs
- `@iofinnet/io-vault-cldsvc-sdk` (^3.5.1): Vault cloud service integration
- `@iofinnet/io-vault-db-sdk` (^8.6.0): Database models and queries

### Chain SDKs
- `@iofinnet/io-core-dapp-utils-chains-config` (^0.2.6): Chain configurations
- `@iofinnet/io-core-dapp-utils-chains-sdk` (^10.2.3): Chain utilities

### Core Platform SDKs
- `@iofinnet/io-core-cldsvc-sdk` (^13.17.1): Core platform services
- `@iofinnet/io-core-cldsvc-errors-sdk` (1.11.3): Platform error types

## Development Tools

### Testing

#### Vitest
- **Version**: ^3.2.4
- **Purpose**: Unit, integration, and E2E testing
- **Features**:
  - Fast test execution
  - ESM support
  - TypeScript support
  - Mocking capabilities
- **Plugins**:
  - `vitest-fetch-mock`: HTTP mocking
  - `aws-sdk-client-mock-vitest`: AWS SDK mocking
  - `vite-tsconfig-paths`: Path mapping support

### Code Quality

#### Biome
- **Package**: `@biomejs/biome`
- **Version**: ^2.2.4
- **Purpose**: Unified linter and formatter (replaces ESLint + Prettier)
- **Features**:
  - Fast formatting
  - Import sorting
  - Auto-fix on save
- **Configuration**: `biome.json`

### Build & Bundling

#### esbuild
- **Integration**: Via `serverless-esbuild`
- **Version**: ^1.55.0
- **Purpose**: Fast TypeScript/JavaScript bundling
- **Features**:
  - Tree shaking
  - Minification
  - Source maps
  - External dependencies handling

#### tsx
- **Version**: ^4.20.3
- **Purpose**: TypeScript execution for scripts
- **Usage**: OpenAPI generation, database migrations, utility scripts

### OpenAPI & Documentation

#### OpenAPI Generation
- **Packages**:
  - `fastify-type-provider-zod` (6.1.0): Generate OpenAPI from Zod schemas via Fastify integration
  - `@fastify/swagger` (^9.6.1): Swagger/OpenAPI documentation
  - `@fastify/swagger-ui` (^5.2.4): Swagger UI for API documentation
- **Output**: OpenAPI spec served via Fastify routes

### Utilities

#### Development Dependencies
- `@faker-js/faker` (^9.9.0): Generate fake data for testing
- `dotenv` (^16.5.0): Environment variable management
- `dotenv-cli` (^8.0.0): CLI for dotenv
- `ts-node` (^10.9.2): TypeScript execution
- `p-limit` (^5.0.0): Concurrency control
- `pretty-format` (^29.7.0): Test output formatting

## External APIs & Services

### Blockchain Services
- **Noves**: `https://aws.streams.noves.fi` - Transaction stream subscriptions
- **Tatum**: `https://api.tatum.io` - Multi-chain blockchain API
- **TronScan**: `https://apilist.tronscanapi.com` - Tron blockchain explorer API
- **Adamik**: Multi-chain blockchain data provider

### Security & Data
- **Blockaid**: Real-time transaction security scanning
- **CoinGecko**: `https://pro-api.coingecko.com/api/v3` - Token pricing and market data

### Platform Services
- **Platform Authorizer**: JWT validation and authentication
- **Platform EventBridge**: Cross-service event bus
- **Platform GraphQL API**: User, organization, and workspace queries
- **Permit.io PDP**: `https://permit-pdp-alb.platform.*.iodevnet.com` - Policy decisions

### IOFinnet Internal Services
- **IOFinnet Nodes RPC**: Blockchain node access
- **IOFinnet API**: Platform API integration

## CI/CD & DevOps

### GitHub Actions
- **Workflows**: `.github/workflows/`
- **Purpose**: Automated testing, deployment, and release management
- **Features**:
  - Multi-stage deployment (dev → staging → prod)
  - Integration and E2E tests
  - Semantic versioning
  - Rollback capabilities

### Deployment Tools
- **Serverless Framework CLI**: v4.x
- **AWS CLI**: Configured via OIDC roles
- **Node.js**: v22.x via GitHub Actions

### Secrets Management
- **GitHub Secrets**: CI/CD credentials
- **AWS Secrets Manager**: Runtime secrets

## Version Control

### Git
- **Platform**: GitHub
- **Branching Strategy**: GitFlow-based
  - `master`: Production
  - `staging`: Staging environment
  - Feature branches for development

## Package Management

### npm
- **Version**: ^11.3.0
- **Workspaces**: Enabled for monorepo management
- **Registry**: Private IOFinnet registry for internal packages

## Environment Configuration

### Stages
- **dev**: Development environment (AWS Account: 753319136529)
- **staging**: Staging environment (AWS Account: 448729746276)
- **prod**: Production environment (AWS Account: 626512568952)

### Configuration Management
- **Serverless Parameters**: Stage-specific parameters in `serverless.ts`
- **Environment Variables**: Injected via Serverless Framework
- **AWS Systems Manager (SSM)**: Parameter Store for infrastructure IDs
- **AWS Secrets Manager**: Sensitive credentials

## Monitoring & Observability

### AWS CloudWatch
- **Logs**: Centralized logging for Lambda functions and Step Functions
- **Metrics**: Custom metrics for business KPIs
- **Alarms**: Configured for error rates and performance

### AWS X-Ray
- **Tracing**: Distributed tracing via AWS Lambda Powertools Tracer
- **Service Map**: Visualization of service dependencies

### Slack Integration
- **Notifications**: Deployment status, test results, error alerts
- **Webhooks**: Configured in GitHub Actions workflows

## Feature Flags

### Environment-Based Flags
- `SYNC_ADDRESS_ENABLED`: Toggle address syncing
- `USE_READ_REPLICA`: Enable/disable read replica usage

## Data Formats

### JSON
- **Purpose**: API request/response, DynamoDB storage, configuration files

### OpenAPI 3.0
- **Purpose**: API documentation and contract

### Markdown
- **Purpose**: Documentation (README.md, API.md, docs/)

## Summary

The io-vault-multi-chain-be leverages a modern, cloud-native technology stack built on AWS serverless services. Key characteristics:

- **Serverless-first**: Lambda, Step Functions, DynamoDB for auto-scaling
- **Type-safe**: TypeScript with Zod for runtime validation
- **Event-driven**: EventBridge and SQS for decoupled architecture
- **Multi-chain**: Support for 20+ blockchain networks
- **Secure**: KMS encryption, Secrets Manager, Permit.io authorization
- **Observable**: CloudWatch Logs, X-Ray tracing, structured logging
- **Testable**: Vitest for comprehensive testing
- **Maintainable**: Biome for code quality, monorepo for code sharing
