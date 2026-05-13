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
- Per-tenant audit log of writes (policies, permissions, roles,
  resource groups, resources, grants, grant requests) with actor,
  action, entity type/id and filterable UI
- Delegated grant management via `/access`: subjects holding a role with
  the `admin` permission on a path can view, edit and delete grants on
  that path without being tenant admins

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
- `permissions`: Hierarchical permissions (path-based, with `admin` and
  `read` seeded as roots for every new tenant)
- `roles`: Roles within the tenant
- `role_permissions`: Many-to-many mapping of permissions to roles
- `resource_groups`: Hierarchical groups for resources
- `resources`: Protected resources, optionally attached to a group
- `grants`: Subject grants (subject + path + role)
- `grant_requests`: Pending/approved/rejected requests for new grants
- `policy_evaluations`: Audit log of policy evaluations
- `audit_logs`: Per-tenant audit log of writes (actor, action, entity
  type, entity id, details)

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

### Permissions, Roles, Resource Groups, Resources (per tenant)
- `GET/POST /tenants/:tenantId/permissions`, `GET/PUT/DELETE /tenants/:tenantId/permissions/:uid`
- `GET/POST /tenants/:tenantId/roles`, `GET/PUT/DELETE /tenants/:tenantId/roles/:uid`,
  `GET /tenants/:tenantId/roles/:uid/permissions`
- `GET/POST /tenants/:tenantId/resource-groups`, `GET/PUT/DELETE /tenants/:tenantId/resource-groups/:uid`,
  `GET /tenants/:tenantId/resource-groups/:uid/resources`
- `GET/POST /tenants/:tenantId/resources`, `GET/PUT/DELETE /tenants/:tenantId/resources/:uid`

### Grants (per tenant)
- `GET /tenants/:tenantId/grants` - List grants
- `GET /tenants/:tenantId/grants/:uid` - Get grant
- `GET /tenants/:tenantId/grants/subject/:subjectUid` - Grants for a subject
- `GET /tenants/:tenantId/grants/role/:roleUid` - Grants for a role
- `POST /tenants/:tenantId/grants` - Create grant
- `PUT /tenants/:tenantId/grants/:uid` - Update grant
- `DELETE /tenants/:tenantId/grants/:uid` - Delete grant
- `GET /tenants/:tenantId/admin-paths?subject_uid=<uid>` - Paths on which
  the subject has the `admin` permission (drives the `/access` UI)

Grant create/update/delete check the `X-Actor-Uid` header: the tenant
admin passes unconditionally, anyone else must have admin permission on
the affected path. Requests without the header pass through (matches
the rest of the app's mocked-subject auth).

### Grant Requests (per tenant)
- `GET /tenants/:schemaName/grant-requests[?status=pending]` - List
- `GET /tenants/:schemaName/grant-requests/subject/:subjectUid` - For a subject
- `POST /tenants/:schemaName/grant-requests` - Create
- `PUT /tenants/:schemaName/grant-requests/:uid/approve` - Approve (requires
  approver with admin permission on the path)
- `PUT /tenants/:schemaName/grant-requests/:uid/reject` - Reject (same gate)
- `DELETE /tenants/:schemaName/grant-requests/:uid` - Delete

### Audit Logs (per tenant)
- `GET /tenants/:tenantId/audit-logs` - Paginated list with optional
  `actor_uid`, `entity_type`, `action`, `limit`, `offset` filters. Returns
  `{ items, total }`. Writes are auto-captured by middleware on
  successful POST/PUT/DELETE under `/tenants/:tenantId/...` (and approve
  / reject of grant requests). The UI sends an `X-Actor-Uid` header to
  attribute writes to the logged-in subject.

## UI Pages

- `/` — Home
- `/tenants` — Tenant list (create tenants)
- `/me` — Subject context: tenants and the subject's grants in each
- `/requests` — Request a grant; see the subject's own requests
- `/access` — Manage existing grants on paths where the subject has the
  `admin` permission (for non-tenant-admin path admins)
- `/admin` — Tenant admin landing page
- `/tenants/:tenantId/permissions|roles|resource-groups|resources|grants|policies|test`
  — Tenant admin management pages
- `/tenants/:tenantId/audit-log` — Audit log viewer with actor / entity
  / action filters and pagination

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
