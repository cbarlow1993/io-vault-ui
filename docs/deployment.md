# Deployment Guide

## Overview

This document describes the deployment architecture, procedures, and infrastructure for the io-vault-multi-chain-be project. The system is deployed using the Serverless Framework to AWS across multiple environments.

## Deployment Architecture

### Multi-Service Monorepo

The project uses **Serverless Compose** to manage deployment of multiple services:

```typescript
// serverless-compose.ts
{
  services: {
    core: { path: 'services/core' },
    rules: { path: 'services/rules' }
  }
}
```

Each service is deployed independently but shares common configuration.

### Environment Strategy

The system supports three deployment environments:

| Environment | AWS Account    | Purpose                          | Region    |
|-------------|----------------|----------------------------------|-----------|
| **dev**     | 753319136529   | Development and testing          | eu-west-1 |
| **staging** | 448729746276   | Pre-production validation        | eu-west-1 |
| **prod**    | 626512568952   | Production workloads             | eu-west-1 |

## Infrastructure Components

### Core Service Infrastructure

#### Lambda Functions
- **API Handlers**: addresses, transactions, balances, chains, vaults, webhooks
- **Internal API**: Service-to-service communication via Lambda Function URL
- **Step Function Tasks**: Transaction enrichment, balance calculation

#### DynamoDB Tables
- **AddressesTable**: `io-vault-multi-chain-core-addresses`
  - On-demand billing
  - KMS encryption
  - GSI for organization/workspace and vault queries

- **TransactionsTable2**: `io-vault-multi-chain-core-transactions-2`
  - On-demand billing
  - DynamoDB Streams enabled
  - TTL for data retention

- **TokenMetadataTable**: `io-vault-multi-chain-core-token-metadata`
  - On-demand billing
  - Caches token information

#### Step Functions
- **Sync Address Transactions**: Fetches historical transactions
- **Enrich Transaction**: Processes and enriches transaction data
- **Add Tatum Subscription**: Manages webhook subscriptions

#### EventBridge Pipes
- **Transaction to Events Pipe**: DynamoDB Streams → Step Functions
- **Enrich Transaction Pipe**: Transaction enrichment orchestration

#### SQS Queues
- **Transaction Sync Queue**: Buffers sync requests
  - VisibilityTimeout: 900s
  - MessageRetentionPeriod: 1209600s (14 days)

#### Secrets Manager
- Blockaid API Key
- Permit.io API Key
- CoinGecko API Key

### Rules Service Infrastructure

#### Lambda Functions
- **API Handlers**: Rules management, execution queries
- **Event Handlers**: Post-transaction processing
- **Execution Handlers**: Rule evaluation and sweep execution
- **Gas Station**: Gas distribution management

#### DynamoDB Tables
- **RulesTable**: `io-vault-multi-chain-rules-rules`
  - Stores rule definitions
  - GSI for organization/vault queries

- **ExecutionTable**: `io-vault-multi-chain-rules-execution`
  - Tracks rule execution history
  - GSI for timestamp-based queries

- **TransfersTable**: `io-vault-multi-chain-rules-transfers`
  - Records automated transfers
  - GSI for transaction lookups

#### Step Functions
- **Post Transaction**: Evaluates single transaction against rules
- **Post Transaction Sweep**: Executes sweep operation
- **Post Transaction Sweep Orchestrator**: Manages parallel sweeps

### Shared Infrastructure

#### RDS PostgreSQL
- **Instance**: Multi-AZ PostgreSQL database
- **Access**: Via RDS Proxy for connection pooling
- **Secrets**: Connection strings in Secrets Manager
  - Read-Write: `io-vault/{stage}/rds_proxy_rw`
  - Read-Only: `io-vault/{stage}/rds_proxy_ro`

#### EventBridge
- **Vault Event Bus**: `io-vault-cldsvc-eventbus-{stage}`
  - Cross-service event routing
  - Integration with Platform EventBridge

#### VPC Configuration
- **VPC**: Stage-specific VPCs (`dev`, `staging`, `prod`)
- **Security Group**: `lambda-sg`
- **Subnets**: Private subnets for Lambda and RDS Proxy

## Deployment Process

### Automated Deployment via GitHub Actions

Deployments are fully automated through GitHub Actions workflows.

#### Workflow Triggers

**Development (dev)**:
- Push to `master` branch
- Workflow: `.github/workflows/dev.yaml`

**Staging**:
- GitHub release published
- Repository dispatch event
- Workflow: `.github/workflows/staging.yaml`

**Production (prod)**:
- Manual trigger via GitHub Actions
- Workflow: `.github/workflows/prod.yaml`

### Deployment Pipeline

#### 1. Dev Deployment

```yaml
# Triggered on: push to master
Workflow: .github/workflows/dev.yaml

Steps:
1. Checkout code
2. Configure AWS credentials (OIDC role: OIDC_DeploymentRole_dev)
3. Install dependencies (npm ci)
4. Build services (Serverless Framework)
5. Deploy Core service
6. Deploy Rules service
7. Run unit tests
8. Run integration tests (optional)
9. Notify Slack on success/failure
```

#### 2. Staging Deployment

```yaml
# Triggered on: release published
Workflow: .github/workflows/staging.yaml

Steps:
1. Deploy to AWS staging account
   - AWS Account: 448729746276
   - Role: arn:aws:iam::448729746276:role/OIDC_DeploymentRole_staging

2. Run integration tests
   - VPN enabled for database access
   - Runs against staging environment

3. Run E2E tests
   - Tests against https://app.staging.iodevnet.com
   - Clerk authentication integration

4. Update last working version tag
   - Sets LAST_SUCCESSFUL_STAGING_TAG variable

5. Rollback on failure (optional, currently disabled)
```

#### 3. Production Deployment

```yaml
# Triggered on: manual workflow dispatch
Workflow: .github/workflows/prod.yaml

Steps:
1. Deploy to AWS prod account
   - AWS Account: 626512568952
   - Role: arn:aws:iam::626512568952:role/OIDC_DeploymentRole_prod

2. Run smoke tests

3. Monitor deployment health

4. Notify Slack on completion
```

### Manual Deployment

For manual deployments or local testing:

```bash
# Deploy all services to a specific stage
serverless deploy --stage <stage> --aws-profile <profile>

# Deploy a specific service
serverless deploy --stage <stage> --aws-profile <profile> --service <service-name>

# Deploy Core service only
cd services/core
serverless deploy --stage dev --aws-profile io-vault-dev

# Deploy Rules service only
cd services/rules
serverless deploy --stage dev --aws-profile io-vault-dev
```

## AWS Account Configuration

### IAM Roles

Each environment uses an OIDC role for GitHub Actions authentication:

```
Dev:     arn:aws:iam::753319136529:role/OIDC_DeploymentRole_dev
Staging: arn:aws:iam::448729746276:role/OIDC_DeploymentRole_staging
Prod:    arn:aws:iam::626512568952:role/OIDC_DeploymentRole_prod
```

### Deployment Buckets

Serverless Framework stores deployment artifacts in stage-specific S3 buckets:

```
io.iofinnet.serverless.vault.{region}.{stage}.deploys
```

Example:
- `io.iofinnet.serverless.vault.eu-west-1.dev.deploys`
- `io.iofinnet.serverless.vault.eu-west-1.staging.deploys`
- `io.iofinnet.serverless.vault.eu-west-1.prod.deploys`

## Environment Variables & Parameters

### Stage-Specific Parameters

Parameters are defined in `serverless.ts` under the `params` section:

```typescript
params: {
  default: {
    VPC: 'dev',
    POWERTOOLS_LOG_LEVEL: 'DEBUG',
    // ... default values
  },
  dev: {
    DATABASE_PROXY_URL_SECRET_ID: 'arn:aws:secretsmanager:...',
    PLATFORM_ACCOUNT_ID: '912551604816',
    // ... dev-specific values
  },
  staging: {
    // ... staging-specific values
  },
  prod: {
    // ... prod-specific values
  }
}
```

### Environment Variables

Common environment variables injected into Lambda functions:

**Core Service**:
- `STAGE`: Deployment stage
- `POWERTOOLS_LOG_LEVEL`: Logging level
- `PERMIT_API_KEY`, `PERMIT_PDP_ENDPOINT`: Authorization
- `TATUM_API_KEY`, `TATUM_API_URL`: Blockchain data
- `NOVES_API_KEY`: Transaction enrichment
- `BLOCKAID_API_KEY`: Security scanning
- `COIN_GECKO_API_KEY`: Token pricing
- `DATABASE_PROXY_URL_SECRET_ID`: Database connection

**Rules Service**:
- `POST_TRANSACTION_SF_ARN`: Step Function ARN
- `ADDRESSES_TABLE`: Core addresses table ARN
- `TRANSACTIONS_TABLE`: Core transactions table ARN
- `TRANSFERS_TABLE`: Transfers table name
- `CORE_INTERNAL_URL`: Core internal API URL

### Secrets Management

Secrets are stored in AWS Secrets Manager and referenced in `serverless.ts`:

```typescript
custom: {
  secrets: {
    permitIo: {
      api_key: '${ssm:/permitio/api_key}'
    },
    blockaid: {
      api_key: '${ssm:/blockaid/api_key}'
    },
    coinGecko: {
      api_key: '${ssm:/coingecko/api_key}'
    }
  }
}
```

## Cross-Account Dependencies

### Platform Services

Both Core and Rules services depend on Platform services:

**Platform Authorizer**:
- Dev: `arn:aws:lambda:eu-west-1:912551604816:function:io-platform-cldsvc-authorizer-dev-authorizer`
- Staging: `arn:aws:lambda:eu-west-1:612382899265:function:io-platform-cldsvc-authorizer-staging-authorizer`
- Prod: `arn:aws:lambda:eu-west-1:764652587522:function:io-platform-cldsvc-authorizer-prod-authorizer`

**Platform EventBridge**:
- Dev: `arn:aws:dynamodb:eu-west-1:912551604816:table/io-platform-cldsvc-events-events2`
- Staging: `arn:aws:dynamodb:eu-west-1:612382899265:table/io-platform-cldsvc-events-events2`
- Prod: `arn:aws:dynamodb:eu-west-1:764652587522:table/io-platform-cldsvc-events-events2`

### Service-to-Service Communication

Rules service calls Core service via Lambda Function URL:

- Dev: `https://eksg7a3dbj2extatopbw5zn6re0qswlr.lambda-url.eu-west-1.on.aws`
- Staging: `https://5tlbmu5oqp6ncmodwl35cmhbde0jsxyc.lambda-url.eu-west-1.on.aws`
- Prod: `https://ds5o25qthf3mptz5ngxcfcjy2q0nwchn.lambda-url.eu-west-1.on.aws`

## Build Configuration

### esbuild Settings

```typescript
custom: {
  esbuild: {
    bundle: true,
    minify: true,
    sourcemap: true,
    exclude: ['aws-sdk'],
    target: 'node22',
    define: { 'require.resolve': undefined },
    platform: 'node',
    concurrency: 5,
    skipRebuild: true  // For GitHub runners with limited resources
  }
}
```

### Lambda Package Settings

- **Packaging**: Individual packaging per function
- **Artifact Size**: Typically 1-5 MB per function
- **Runtime**: Node.js 22.x

## Deployment Optimizations

### Prune Plugin

Automatically removes old Lambda versions:

```typescript
custom: {
  prune: {
    automatic: true,
    number: 3  // Keep last 3 versions
  }
}
```

### VPC Discovery

Automatically discovers VPC resources by name:

```typescript
custom: {
  vpcDiscovery: {
    vpcName: '${param:VPC}',
    subnets: [
      { tagKey: 'Name', tagValues: ['private-*'] }
    ]
  }
}
```

## Testing in Deployment Pipeline

### Unit Tests

Run before deployment:

```bash
npm run test:unit --workspaces
```

### Integration Tests

Run after staging/dev deployment:

```bash
npm run test:integration --workspaces
```

- Requires VPN connection to access database
- Tests against deployed AWS resources
- Uses test environment variables from `envs/.env.{stage}.test`

### E2E Tests

Run after staging deployment:

- External repository: `IoFinnet/io-core-e2e`
- Tests full user flows via frontend
- Clerk authentication integration

## Rollback Procedures

### Automatic Rollback (Staging - Currently Disabled)

The staging workflow includes rollback logic (currently commented out):

1. If integration or E2E tests fail
2. Re-deploy last successful staging tag (`LAST_SUCCESSFUL_STAGING_TAG`)
3. Notify team via Slack
4. Fail the pipeline

### Manual Rollback

#### Option 1: Re-deploy Previous Version

```bash
# Find the previous deployment version
git tag --sort=-creatordate | head -5

# Deploy specific version
git checkout <previous-tag>
serverless deploy --stage <stage> --aws-profile <profile>
```

#### Option 2: Use Serverless Framework Rollback

```bash
# Rollback to previous deployment
serverless rollback --timestamp <timestamp> --stage <stage>
```

#### Option 3: AWS Console

1. Navigate to AWS Lambda Console
2. Select affected function
3. Choose "Versions" tab
4. Publish previous version as $LATEST

## Monitoring Deployment

### CloudWatch Logs

Monitor deployment logs in CloudWatch:

- Log Group: `/aws/lambda/<function-name>`
- Step Functions: `/aws/vendedlogs/states/<state-machine-name>`

### Deployment Notifications

Slack notifications sent to:
- Dev/Staging: `#dv2-e2e-alerts`
- General notifications: `SLACK_CHANNEL` (configured per workflow)

### Health Checks

Post-deployment health checks:

1. Verify Lambda function invocations (CloudWatch Metrics)
2. Check Step Function execution status
3. Test API endpoints (smoke tests)
4. Verify DynamoDB table accessibility
5. Check RDS Proxy connectivity

## Troubleshooting

### Common Deployment Issues

#### 1. Timeout During Deployment

**Symptom**: Serverless Framework times out during stack update

**Solution**:
- Increase `role-duration-seconds` in GitHub workflow
- Deploy services individually
- Check CloudFormation stack events in AWS Console

#### 2. Lambda Function Not Updated

**Symptom**: Code changes not reflected in Lambda

**Solution**:
- Verify esbuild bundling completed successfully
- Check deployment bucket for new artifact
- Clear Serverless Framework cache: `serverless deploy --force`

#### 3. Database Connection Failures

**Symptom**: Lambda functions cannot connect to RDS

**Solution**:
- Verify VPC configuration
- Check security group rules
- Confirm RDS Proxy endpoint
- Validate Secrets Manager credentials

#### 4. Cross-Account Permission Denied

**Symptom**: Cannot access Platform services

**Solution**:
- Verify IAM role trust relationships
- Check cross-account role ARNs
- Confirm EventBridge permissions

### Debugging Failed Deployments

1. **Check CloudFormation Stack**:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name <stack-name> \
     --region eu-west-1
   ```

2. **View Serverless Logs**:
   ```bash
   serverless logs --function <function-name> --stage <stage> --tail
   ```

3. **Inspect GitHub Actions Logs**:
   - Navigate to Actions tab in GitHub
   - Select failed workflow run
   - Review job logs

## Security Considerations

### Deployment Security

- OIDC authentication for GitHub Actions (no long-lived credentials)
- Least-privilege IAM roles for Lambda functions
- Encrypted deployment artifacts in S3
- Secrets stored in AWS Secrets Manager
- KMS encryption for DynamoDB tables

### Network Security

- Lambda functions run in private VPC subnets
- RDS Proxy for secure database access
- Security groups restrict inbound/outbound traffic
- NAT Gateway for internet access

## Disaster Recovery

### Backup Strategy

- **DynamoDB**: Point-in-time recovery enabled
- **RDS**: Automated daily backups, 7-day retention
- **Code**: Git version control with tagged releases

### Recovery Procedures

1. **Database Restore**:
   ```bash
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name <table-name> \
     --target-table-name <restored-table-name> \
     --restore-date-time <timestamp>
   ```

2. **Complete Environment Rebuild**:
   ```bash
   # Deploy from last known good tag
   git checkout <stable-tag>
   serverless deploy --stage <stage>
   ```

## Cost Optimization

- **Lambda**: Pay-per-invocation with reserved concurrency
- **DynamoDB**: On-demand billing scales with usage
- **Step Functions**: Express workflows for cost-effective orchestration
- **RDS Proxy**: Reduces connection overhead
- **Prune Plugin**: Automatically removes old Lambda versions

## Compliance & Audit

### Deployment Audit Trail

- All deployments logged in CloudFormation events
- GitHub Actions provides full deployment history
- IAM CloudTrail logs all API calls
- DynamoDB streams capture data changes

### Access Control

- GitHub repository: Restricted to authorized developers
- AWS accounts: MFA enforced for console access
- Deployment roles: Scoped to specific resources
- Secrets: Rotated regularly via Secrets Manager
