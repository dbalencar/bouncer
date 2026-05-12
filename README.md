# Bouncer - Policy Decision Point (PDP)

A 3-tier application for authorization policy management and evaluation using OPA (Open Policy Agent).

## Architecture

- **Database**: PostgreSQL with schema-per-tenant multi-tenancy
- **API**: Node.js + Express with embedded OPA WASM
- **UI**: React with Vite

## Features

- Multi-tenant architecture with isolated schemas
- Policy management (create, read, update, delete)
- Policy evaluation with OPA/Rego
- Subject management (mock OIDC/Okta subjects)
- Policy testing playground
- Audit logging for policy evaluations

## Prerequisites

- Podman and podman-compose (Docker and Docker Compose also supported)
- Node.js 18+
- npm or yarn

## Getting Started

### 1. Start PostgreSQL

```bash
# Using Podman (recommended)
podman-compose up -d

# Or using Docker
docker-compose up -d
```

This will start PostgreSQL and run the initial migrations and seed data.

### 2. Install API Dependencies

```bash
cd api
npm install
```

### 3. Start API Server

```bash
npm run dev
```

The API will start on http://localhost:3001

### 4. Install UI Dependencies

```bash
cd ui
npm install
```

### 5. Start UI Development Server

```bash
npm run dev
```

The UI will start on http://localhost:5173

## Database Schema

### Common Schema
- `subjects`: Mock OIDC/Okta subjects (uid, username, name, email)

### Public Schema
- `tenants`: Tenant metadata (id, name, schema_name)

### Tenant Schemas (per tenant)
- `policies`: OPA/Rego policies
- `resources`: Protected resources
- `policy_evaluations`: Audit log of policy evaluations

## Seed Data

The following subjects are seeded for demo purposes:
- admin
- dev
- owner
- l6, l5, l4, l3 (manager levels)
- audit
- sec

## API Endpoints

### Tenants
- `GET /tenants` - List all tenants
- `POST /tenants` - Create new tenant
- `GET /tenants/:id` - Get tenant details
- `DELETE /tenants/:id` - Delete tenant

### Subjects
- `GET /subjects` - List all subjects
- `GET /subjects/:uid` - Get subject by UID
- `GET /subjects/username/:username` - Get subject by username

### Policies (per tenant)
- `GET /tenants/:tenantId/policies` - List policies
- `POST /tenants/:tenantId/policies` - Create policy
- `GET /tenants/:tenantId/policies/:id` - Get policy
- `PUT /tenants/:tenantId/policies/:id` - Update policy
- `DELETE /tenants/:tenantId/policies/:id` - Delete policy

### Policy Evaluation
- `POST /tenants/:tenantId/evaluate` - Evaluate policy

## Example Policy (Rego)

```rego
package bouncer

default allow = false

allow {
  input.subject.username == "admin"
}

allow {
  input.action == "read"
}

allow {
  input.resource.type == "document"
  input.action == "write"
  input.subject.username == "owner"
}
```

## Development

### API Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

### UI Development
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Security Notes

- This is a demo application with mocked OIDC/Okta authentication
- For production, implement proper OIDC integration
- Use environment variables for sensitive configuration
- Implement proper authentication/authorization for the API itself
- Use HTTPS in production
- Implement rate limiting for the evaluation endpoint

## License

MIT
