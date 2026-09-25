# Database Architecture — Municipal Child Mapping System

## Overview

The database uses **Turso/libSQL** with **Drizzle ORM** for type-safe, server-side access. It supports the complete child mapping lifecycle: collection, validation, verification, monitoring, reporting, and audit.

## Database Technology

- **Database**: Turso cloud (production) / SQLite file `local.db` (development)
- **ORM**: Drizzle ORM (`drizzle-orm/libsql`)
- **Connection**: `@libsql/client` via `src/db/index.ts`
- **Schema Location**: `src/db/schema.ts`
- **Migration System**: Drizzle Kit (`npm run db:generate`, `npm run db:migrate`)

## Turso Setup

### Environment Variables

```env
TURSO_DATABASE_URL=<your-turso-database-url>
TURSO_AUTH_TOKEN=<your-turso-auth-token>
```

These values are configured in `.env.local` for development and in the hosting environment for production. Never expose them to client-side code.

### Migration Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:push
```

### Development Process

1. Configure `.env.local` with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (or `LIBSQL_URL=file:./local.db`).
2. Run `npm run db:migrate` to apply schema changes.
3. Run `npm run seed` to populate development/reference data.
4. Restart the dev server (`npm run dev`).

### Production Deployment

1. Set production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` securely.
2. Ensure `SESSION_COOKIE_SECURE=true` for HTTPS deployments.
3. Verify `.env.local` is excluded from the deployment package.

---

# Documentation Index

- `README.md` (this file)
- `ERD.md` — Complete entity relationship diagram
- `SCHEMA.md` — Table definitions
- `RELATIONSHIPS.md` — Foreign key relationships
- `ROLES-AND-PERMISSIONS.md` — Role and permission mappings
- `SEED-DATA.md` — Development seed data
- `MIGRATIONS.md` — Migration process
- `SECURITY-AND-PRIVACY.md` — Security and privacy measures
- `AUDIT-LOGGING.md` — Audit log design
- `TURSO-SETUP.md` — Turso/libSQL configuration
- `DEVELOPMENT-CREDENTIALS.md` — Default accounts (development only)
