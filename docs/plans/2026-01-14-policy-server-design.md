# Policy Server Design

**Date:** 2026-01-14
**Status:** Draft
**Author:** Architecture Session

## Overview

A policy server using Open Policy Agent (OPA) deployed as sidecars, providing comprehensive authorization for the vault multi-chain backend. Covers transaction controls, fine-grained RBAC, multi-tenant policy management, and compliance audit trails.

## Requirements

- **Transaction controls** - Amount limits, destination allowlists, time-based restrictions
- **Fine-grained RBAC** - Roles (Admin, Operator, Approver, Viewer) with endpoint and resource-level permissions
- **Multi-tenant policies** - Each organization defines their own rules via rule builder
- **Graduated approvals** - Different approval tiers based on transaction value
- **Compliance audit** - Full decision replay with complete input context
- **External data** - Sanctions lists (bundled), risk scores (real-time)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Infrastructure                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐       │
│  │   Service    │      │   Service    │      │   Service    │       │
│  │   Instance   │      │   Instance   │      │   Instance   │       │
│  │              │      │              │      │              │       │
│  │  ┌────────┐  │      │  ┌────────┐  │      │  ┌────────┐  │       │
│  │  │  OPA   │  │      │  │  OPA   │  │      │  │  OPA   │  │       │
│  │  │Sidecar │  │      │  │Sidecar │  │      │  │Sidecar │  │       │
│  │  └────────┘  │      │  └────────┘  │      │  └────────┘  │       │
│  └──────────────┘      └──────────────┘      └──────────────┘       │
│           │                    │                    │                │
│           └────────────────────┼────────────────────┘                │
│                                │                                     │
│                                ▼                                     │
│                    ┌──────────────────────┐                         │
│                    │    Bundle Server     │                         │
│                    │  (Policy Compiler)   │                         │
│                    └──────────────────────┘                         │
│                                │                                     │
│                                ▼                                     │
│                    ┌──────────────────────┐                         │
│                    │     PostgreSQL       │                         │
│                    │  - Policy Rules      │                         │
│                    │  - Sanctions Data    │                         │
│                    │  - Decision Logs     │                         │
│                    └──────────────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| OPA Sidecars | Low-latency policy evaluation (~1ms), one per service instance |
| Bundle Server | Compiles database rules to Rego, serves bundles to OPA |
| PostgreSQL | Policy rules, audit logs, cached external data |
| Middleware | Coarse-grained RBAC on endpoints |
| PolicyService | Fine-grained transaction decisions |
| Rule Builder API | Organization self-service policy configuration |
| Decision Logger | Full audit trail with replay capability |
| External Data Sync | Sanctions/risk data integration |

### Request Flow

1. Request hits Fastify backend
2. Middleware calls OPA sidecar for coarse-grained check (can user access this endpoint?)
3. Handler calls OPA sidecar for fine-grained check (can user perform this action on this resource?)
4. Decision logged to PostgreSQL asynchronously

## Database Schema

### Policy Rules

```sql
-- Organization-level policy configuration
CREATE TABLE policy_sets (
    id              UUID PRIMARY KEY,
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    version         INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual rules within a policy set
CREATE TABLE policy_rules (
    id              UUID PRIMARY KEY,
    policy_set_id   UUID NOT NULL REFERENCES policy_sets(id),
    name            VARCHAR(255) NOT NULL,
    priority        INTEGER DEFAULT 0,  -- Higher = evaluated first

    -- What this rule applies to
    resource_type   VARCHAR(50) NOT NULL,  -- 'transaction', 'vault', 'address', '*'
    action          VARCHAR(50) NOT NULL,  -- 'create', 'approve', 'sign', '*'

    -- Conditions (JSON structure for rule builder)
    conditions      JSONB NOT NULL DEFAULT '[]',

    -- Decision outcome
    effect          VARCHAR(20) NOT NULL,  -- 'allow', 'deny', 'require_approval'
    approval_tiers  JSONB,  -- [{ "threshold": 10000, "approvers_required": 1 }, ...]
    denial_reason   TEXT,

    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined condition vocabulary
CREATE TABLE policy_condition_types (
    id              UUID PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,  -- 'amount_greater_than'
    category        VARCHAR(50) NOT NULL,   -- 'transaction', 'user', 'time'
    operator        VARCHAR(20) NOT NULL,   -- 'gt', 'lt', 'eq', 'in', 'not_in'
    value_type      VARCHAR(20) NOT NULL,   -- 'number', 'string', 'string[]', 'boolean'
    description     TEXT
);
```

### Decision Audit Log

```sql
CREATE TABLE policy_decisions (
    id                  UUID PRIMARY KEY,
    organisation_id     UUID NOT NULL,

    -- What was evaluated
    policy_path         VARCHAR(255) NOT NULL,  -- 'org.<id>.transaction' or 'rbac.endpoints'
    policy_version      INTEGER NOT NULL,

    -- Complete input (for replay)
    input_snapshot      JSONB NOT NULL,

    -- Decision result
    decision            JSONB NOT NULL,
    effect              VARCHAR(20) NOT NULL,
    rule_id             UUID,

    -- Request context
    request_id          UUID NOT NULL,
    endpoint            VARCHAR(255),

    -- Timing
    evaluation_time_ms  INTEGER NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE TABLE policy_decisions PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_decisions_org_time ON policy_decisions(organisation_id, created_at DESC);
CREATE INDEX idx_decisions_effect ON policy_decisions(effect, created_at DESC);
```

### External Data Cache

```sql
CREATE TABLE external_data_cache (
    id          UUID PRIMARY KEY,
    data_type   VARCHAR(100) UNIQUE NOT NULL,  -- 'sanctions_addresses'
    data        JSONB NOT NULL,
    source      VARCHAR(100) NOT NULL,
    fetched_at  TIMESTAMPTZ NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL
);
```

## Rego Policy Structure

### Organization Transaction Policy

```rego
# policies/org/<org_id>/transaction.rego

package org.<org_id>.transaction

import rego.v1

default decision := {"effect": "deny", "reason": "no matching policy"}

# Input structure:
# {
#   "user": { "id", "roles", "organisation_id" },
#   "resource": { "type", "vault_id", "chain", "address" },
#   "action": { "type", "amount", "destination", "metadata" },
#   "time": { "timestamp", "day_of_week", "hour" },
#   "historical": { "tx_count_today", "total_amount_today" },
#   "external": { "destination_risk_score" }
# }

# High value transaction approval
decision := result if {
    input.action.type == "create"
    input.resource.type == "transaction"
    input.action.amount > 10000
    result := {
        "effect": "require_approval",
        "approvers_required": approval_tier(input.action.amount),
        "approver_roles": approver_roles(input.action.amount),
        "rule_id": "rule-uuid-here",
        "rule_name": "High value transaction approval"
    }
}

# Block non-allowlisted destinations
decision := result if {
    input.action.type == "create"
    input.resource.type == "transaction"
    not destination_in_allowlist(input.action.destination)
    result := {
        "effect": "deny",
        "reason": "Destination address not in allowlist",
        "rule_id": "rule-uuid-here"
    }
}

# Graduated approval tiers
approval_tier(amount) := 1 if amount <= 100000
approval_tier(amount) := 2 if { amount > 100000; amount <= 1000000 }
approval_tier(amount) := 3 if amount > 1000000

approver_roles(amount) := ["operator"] if amount <= 100000
approver_roles(amount) := ["admin"] if { amount > 100000; amount <= 1000000 }
approver_roles(amount) := ["admin", "board"] if amount > 1000000

destination_in_allowlist(addr) if {
    data.org.<org_id>.allowlists.addresses[_] == addr
}
```

### RBAC Endpoint Policy

```rego
# policies/rbac/endpoints.rego

package rbac.endpoints

import rego.v1

default allow := false

endpoint_permissions := {
    "admin": ["*"],
    "operator": ["/v2/vaults/*", "/v2/transactions/*", "/v2/addresses/*"],
    "viewer": ["/v2/vaults/*/details", "/v2/transactions/*/status"],
    "approver": ["/v2/transactions/*/approve", "/v2/transactions/*/reject"]
}

allow if {
    some role in input.user.roles
    some pattern in endpoint_permissions[role]
    glob.match(pattern, ["/"], input.request.path)
}
```

## Fastify Integration

### OPA Client Interface

```typescript
// src/services/policy/opa-client.ts

interface PolicyInput {
  user: {
    id: string;
    roles: string[];
    organisation_id: string;
  };
  resource: {
    type: 'transaction' | 'vault' | 'address';
    vault_id?: string;
    chain?: string;
  };
  action: {
    type: 'create' | 'approve' | 'sign' | 'read';
    amount?: number;
    destination?: string;
  };
  time: {
    timestamp: string;
    day_of_week: number;
    hour: number;
  };
  historical: {
    tx_count_today: number;
    total_amount_today: number;
  };
  external: {
    destination_risk_score?: number;
  };
}

type PolicyDecision =
  | { effect: 'allow'; rule_id: string }
  | { effect: 'deny'; reason: string; rule_id: string }
  | {
      effect: 'require_approval';
      approvers_required: number;
      approver_roles: string[];
      rule_id: string;
    };

interface OpaClient {
  evaluateEndpointAccess(userId: string, roles: string[], path: string, method: string): Promise<boolean>;
  evaluatePolicy(orgId: string, input: PolicyInput): Promise<PolicyDecision>;
}
```

### Middleware (Coarse-Grained RBAC)

```typescript
// src/plugins/policy-middleware.ts

export const policyMiddleware: FastifyPluginAsync = async (server) => {
  server.addHook('preHandler', async (request, reply) => {
    if (isPublicRoute(request.url)) return;

    const { userId, roles } = request.auth!;
    const allowed = await server.opa.evaluateEndpointAccess(
      userId,
      roles,
      request.url,
      request.method
    );

    if (!allowed) {
      throw new OperationForbiddenError('Insufficient permissions for this endpoint');
    }
  });
};
```

### Handler-Level Policy Service

```typescript
// src/services/policy/policy-service.ts

export class OpaPolicyService implements PolicyService {
  constructor(private opa: OpaClient, private historical: HistoricalDataService) {}

  async evaluate(context: WorkflowContext): Promise<PolicyResult> {
    const historical = await this.historical.getUserStats(
      context.createdBy.id,
      context.organisationId
    );

    const input: PolicyInput = {
      user: {
        id: context.createdBy.id,
        roles: context.createdBy.roles,
        organisation_id: context.organisationId,
      },
      resource: {
        type: 'transaction',
        vault_id: context.vaultId,
        chain: context.chain,
      },
      action: {
        type: 'create',
        amount: context.amount,
        destination: context.destination,
      },
      time: getCurrentTimeContext(),
      historical,
      external: {
        destination_risk_score: context.riskScore,
      },
    };

    const decision = await this.opa.evaluatePolicy(context.organisationId, input);
    return this.mapToWorkflowResult(decision);
  }
}
```

## Bundle Server

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Bundle Server                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Poller    │───▶│  Compiler   │───▶│   Cache     │         │
│  │             │    │             │    │             │         │
│  │ - DB changes│    │ - Rules→Rego│    │ - Bundles   │         │
│  │ - Sanctions │    │ - Allowlists│    │ - ETags     │         │
│  │ - Allowlists│    │ - Sanctions │    │ - Versions  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                               │                  │
│                                               ▼                  │
│                                    ┌─────────────────┐          │
│                                    │   HTTP Server   │          │
│                                    │                 │          │
│                                    │ GET /bundles/   │          │
│                                    │   {org_id}      │          │
│                                    └─────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Responsibilities

1. **Poller** (runs every 30-60 seconds)
   - Checks `policy_rules.updated_at` for changes
   - Fetches updated sanctions lists from external source
   - Triggers recompilation only when changes detected

2. **Compiler**
   - Transforms `policy_rules` rows into Rego syntax
   - Bundles allowlists and sanctions data as `data.json`
   - Generates deterministic bundle hash for cache invalidation

3. **HTTP Server**
   - `GET /bundles/{org_id}/bundle.tar.gz` - Organization-specific bundle
   - `GET /bundles/shared/bundle.tar.gz` - Shared RBAC policies + sanctions
   - Returns `ETag` header for cache invalidation

### OPA Sidecar Configuration

```yaml
services:
  bundle-server:
    url: http://bundle-server:8181

bundles:
  org-policies:
    service: bundle-server
    resource: /bundles/${ORG_ID}/bundle.tar.gz
    polling:
      min_delay_seconds: 30
      max_delay_seconds: 60
  shared-policies:
    service: bundle-server
    resource: /bundles/shared/bundle.tar.gz
    polling:
      min_delay_seconds: 300
```

## Rule Builder API

### Endpoints

```
POST   /v2/policies                    # Create policy set
GET    /v2/policies                    # List org's policy sets
GET    /v2/policies/:id                # Get policy set with rules
PUT    /v2/policies/:id                # Update policy set
DELETE /v2/policies/:id                # Soft delete policy set

POST   /v2/policies/:id/rules          # Add rule to set
GET    /v2/policies/:id/rules          # List rules in set
PUT    /v2/policies/:id/rules/:ruleId  # Update rule
DELETE /v2/policies/:id/rules/:ruleId  # Remove rule

GET    /v2/policies/conditions         # List available condition types

POST   /v2/policies/:id/test           # Dry-run policy against sample input
```

### Create Rule Request

```typescript
interface CreateRuleRequest {
  name: string;
  priority: number;
  resource_type: 'transaction' | 'vault' | 'address' | '*';
  action: 'create' | 'approve' | 'sign' | '*';
  conditions: Array<{
    type: string;
    value: unknown;
  }>;
  effect: 'allow' | 'deny' | 'require_approval';
  approval_tiers?: Array<{
    threshold: number;
    approvers_required: number;
    approver_roles: string[];
  }>;
  denial_reason?: string;
}
```

### Condition Vocabulary

| Type | Category | Value Type | Description |
|------|----------|------------|-------------|
| `amount_greater_than` | transaction | number | Transaction amount exceeds value |
| `amount_less_than` | transaction | number | Transaction amount below value |
| `chain_in` | transaction | string[] | Chain is in list |
| `chain_not_in` | transaction | string[] | Chain is not in list |
| `destination_in_allowlist` | transaction | boolean | Destination on org's allowlist |
| `destination_not_in_allowlist` | transaction | boolean | Destination not on allowlist |
| `hour_between` | time | number[] | Hour is within range [start, end] |
| `day_of_week_in` | time | number[] | Day is in list (1=Mon, 7=Sun) |
| `user_role_in` | user | string[] | User has one of these roles |
| `daily_tx_count_exceeds` | historical | number | User's tx count today exceeds |
| `daily_amount_exceeds` | historical | number | User's total amount today exceeds |
| `risk_score_above` | external | number | Destination risk score exceeds |

## External Data Integration

### Bundled Data (Slow-Changing)

```typescript
// src/services/policy/external-data-sync.ts

export class ExternalDataSync {
  async syncSanctionsList(): Promise<void> {
    const sanctions = await this.sanctionsProvider.fetchList();

    await this.db
      .insertInto('external_data_cache')
      .values({
        id: uuid(),
        data_type: 'sanctions_addresses',
        data: JSON.stringify(sanctions.addresses),
        source: 'chainalysis',
        fetched_at: new Date(),
        expires_at: addHours(new Date(), 24),
      })
      .onConflict((oc) => oc.column('data_type').doUpdateSet({
        data: JSON.stringify(sanctions.addresses),
        fetched_at: new Date(),
        expires_at: addHours(new Date(), 24),
      }))
      .execute();

    await this.bundleServer.triggerRecompile('shared');
  }
}
```

### Per-Request Data (Real-Time)

```typescript
// src/services/policy/risk-enrichment.ts

export class RiskEnrichmentService {
  private cache: LRUCache<string, RiskScore>;

  constructor(private riskProvider: RiskProvider) {
    this.cache = new LRUCache({ max: 10000, ttl: 1000 * 60 * 5 });
  }

  async enrichPolicyInput(input: PolicyInput): Promise<PolicyInput> {
    if (!input.action.destination) return input;

    let riskScore = this.cache.get(input.action.destination);

    if (!riskScore) {
      riskScore = await this.riskProvider.getAddressRisk(input.action.destination);
      this.cache.set(input.action.destination, riskScore);
    }

    return {
      ...input,
      external: {
        ...input.external,
        destination_risk_score: riskScore.score,
        destination_risk_category: riskScore.category,
      },
    };
  }
}
```

## Audit & Decision Replay

### Async Logging

```typescript
// src/services/policy/decision-logger.ts

export class DecisionLogger {
  private queue: PolicyDecisionLog[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private db: Database, private batchSize = 100) {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  log(decision: PolicyDecisionLog): void {
    this.queue.push(decision);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    await this.db
      .insertInto('policy_decisions')
      .values(batch)
      .execute();
  }
}
```

### Decision Replay

```typescript
// src/services/policy/decision-replay.ts

export class DecisionReplay {
  async replayDecision(decisionId: string): Promise<{
    original: PolicyDecision;
    replayed: PolicyDecision;
    matches: boolean;
  }> {
    const record = await this.db
      .selectFrom('policy_decisions')
      .where('id', '=', decisionId)
      .selectAll()
      .executeTakeFirstOrThrow();

    const replayed = await this.opa.evaluatePolicy(
      record.organisation_id,
      record.input_snapshot
    );

    return {
      original: record.decision,
      replayed,
      matches: JSON.stringify(record.decision) === JSON.stringify(replayed),
    };
  }
}
```

## Deployment

### Docker Compose

```yaml
services:
  vault-backend:
    image: vault-backend:latest
    environment:
      OPA_URL: http://localhost:8181
      POLICY_BUNDLE_SERVER: http://bundle-server:8080
    depends_on:
      - opa-sidecar

  opa-sidecar:
    image: openpolicyagent/opa:latest
    command:
      - "run"
      - "--server"
      - "--addr=0.0.0.0:8181"
      - "--config-file=/config/opa.yaml"
    volumes:
      - ./opa-config.yaml:/config/opa.yaml
    network_mode: "service:vault-backend"

  bundle-server:
    image: policy-bundle-server:latest
    environment:
      DATABASE_URL: ${DATABASE_URL}
      BUNDLE_CACHE_DIR: /bundles
      POLL_INTERVAL_SECONDS: 30
    volumes:
      - bundle-cache:/bundles

  sanctions-sync:
    image: policy-bundle-server:latest
    command: ["node", "dist/jobs/sync-sanctions.js"]
    deploy:
      mode: replicated
      replicas: 0  # Run via cron
```

### Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| `opa_decision_latency_p99` | > 50ms |
| `opa_bundle_last_successful_download` | > 10 minutes ago |
| `policy_decisions_denied_rate` | Spike > 3x normal |
| `bundle_compilation_errors` | Any |
| `sanctions_data_age` | > 25 hours |

### Graceful Degradation

```typescript
async evaluatePolicy(orgId: string, input: PolicyInput): Promise<PolicyDecision> {
  try {
    return await this.callOpa(orgId, input);
  } catch (error) {
    if (this.config.failOpen) {
      this.logger.error('OPA unavailable, failing open', { error, input });
      return { effect: 'allow', rule_id: 'failopen' };
    }
    throw new ServiceUnavailableError('Policy engine unavailable');
  }
}
```

## Implementation Phases

### Phase 1: Foundation
- Database schema migrations
- OPA client service
- Basic Rego policies (hardcoded)
- Decision logging

### Phase 2: Bundle Server
- Bundle server implementation
- Rule compiler (DB → Rego)
- OPA sidecar deployment
- Policy middleware integration

### Phase 3: Rule Builder
- Rule builder API endpoints
- Condition vocabulary
- Policy test endpoint
- Replace stub PolicyService

### Phase 4: External Data
- Sanctions list sync
- Risk score integration
- Allowlist management

### Phase 5: Operations
- Monitoring dashboards
- Alert configuration
- Decision replay tooling
- Admin UI (optional)
