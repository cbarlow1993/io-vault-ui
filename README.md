# io-vault-ui

A secure, enterprise-grade web application for managing cryptographic vaults, signers, and digital asset operations. Built with a modern React stack for institutional custody and key management.

## Features

### Vault Management
- **Create and manage vaults** with multi-signature (threshold) support
- **Multiple cryptographic curves**: Ed25519, secp256k1, secp256r1
- **Vault lifecycle management**: draft, active, and archived states
- **Key generation and storage** with public key fingerprinting

### Signer Management
- **Register signers** (mobile or server-based) with secure pairing
- **Health monitoring** with version tracking and outdated detection
- **Signer configuration** and lifecycle management (active, pending, revoked)

### Organization & Access Control
- **Multi-tenant workspaces** with team-based organization
- **Role-based access control (RBAC)** for granular permissions
- **Member management** with invitation workflows
- **Audit logging** for compliance and traceability

### Operations & Compliance
- **Transaction operations** with multi-signature approval workflows
- **Policy management** for governance rules
- **Address book** for trusted destinations
- **Identity management** for KYC/compliance

### Billing & Settings
- **Chargebee integration** for subscription management (optional)
- **Backup management** for disaster recovery
- **Governance settings** with pending approval workflows

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │  TanStack   │  │     shadcn/ui           │  │
│  │   + React   │  │   Router    │  │   + Tailwind CSS        │  │
│  │   Compiler  │  │   + Query   │  │   + Radix UI            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BFF (Backend for Frontend)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    oRPC     │  │   Clerk     │  │     Zod Validation      │  │
│  │   Routers   │  │    Auth     │  │   + Type Safety         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │   Vault API     │  │   Chargebee   │  │    PostgreSQL     │  │
│  │  (Core Service) │  │   (Billing)   │  │   (Local State)   │  │
│  └─────────────────┘  └───────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── components/       # Shared UI components (buttons, modals, tables)
├── features/         # Feature modules (domain-driven)
│   ├── auth/         # Authentication flows
│   ├── vaults/       # Vault management
│   ├── signers/      # Signer management
│   ├── settings/     # Organization settings
│   ├── compliance/   # Compliance features
│   └── ...
├── server/           # Backend code
│   ├── routers/      # oRPC API routers
│   ├── vault-api/    # External Vault API client
│   └── webhooks/     # Webhook handlers
├── lib/              # Utility libraries
├── hooks/            # Shared React hooks
├── routes/           # File-based routing (TanStack Router)
└── styles/           # Global styles and design tokens
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + Vite) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| State/Data | [TanStack Query](https://tanstack.com/query) |
| API Layer | [oRPC](https://orpc.unnoq.com/) |
| Auth | [Clerk](https://clerk.com/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Validation | [Zod](https://zod.dev/) |
| Forms | [React Hook Form](https://react-hook-form.com/) |
| Testing | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| Database | PostgreSQL (via Docker) |

## Requirements

- [Node.js](https://nodejs.org) >= 22
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for local PostgreSQL)

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd io-vault-ui
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required: Clerk authentication
CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Required: Vault API endpoint
VAULT_API_URL="https://your-vault-api.example.com"

# Optional: Chargebee billing
ENABLE_CHARGEBEE_BILLING="false"
```

### 3. Start Services

```bash
# Start PostgreSQL via Docker
pnpm dk:init

# Run development server
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Without Docker

If you prefer not to use Docker, set up a PostgreSQL database and update `DATABASE_URL` in your `.env` file.

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint and TypeScript checks |
| `pnpm test` | Run unit/browser tests |
| `pnpm test:ci` | Run tests in CI mode |
| `pnpm e2e` | Run E2E tests |
| `pnpm e2e:ui` | Run E2E tests with UI |
| `pnpm storybook` | Start Storybook |

### Testing Strategy

- **Unit tests** (`*.unit.spec.ts`): Pure functions and utilities
- **Browser tests** (`*.browser.spec.ts`): Component rendering and interactions
- **E2E tests** (`e2e/*.spec.ts`): Critical user flows

### Code Quality

```bash
# Before committing
pnpm lint        # ESLint + TypeScript
pnpm test:ci     # All tests
pnpm build       # Verify build
```

## Deployment

### Production Build

```bash
pnpm install
pnpm build
pnpm start
```

The build outputs to `.output/` and runs via Nitro.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_API_URL` | Yes | URL to the Vault API backend |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `VITE_BASE_URL` | Yes | Public URL of the application |
| `ENABLE_CHARGEBEE_BILLING` | No | Enable Chargebee integration |
| `CHARGEBEE_SITE` | If billing enabled | Chargebee site ID |
| `CHARGEBEE_API_KEY` | If billing enabled | Chargebee API key |

### Environment Indicators

Show environment name in the UI for non-production environments:

```env
VITE_ENV_NAME="staging"
VITE_ENV_EMOJI="🔬"
VITE_ENV_COLOR="teal"
```

### CI/CD

GitHub Actions workflow runs on every push/PR:
- ESLint linting
- TypeScript type checking
- Unit and browser tests

See `.github/workflows/code-quality.yml` for details.

## IDE Setup

### VS Code

```bash
cp .vscode/settings.example.json .vscode/settings.json
```

### Zed

```bash
cp .zed/settings.example.json .zed/settings.json
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guidelines and coding standards
- [docs/](./docs/) - Additional documentation and design specs

## License

Proprietary - All rights reserved.
