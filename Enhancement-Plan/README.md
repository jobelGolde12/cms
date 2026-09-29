# Enhancement-Plan — Child Mapping System

## Audit Status
Started: 2026-09-29
Status: In Progress — Implementation Phase Active

## Existing Planning Reference
The repository already contains `enhanced-plan/` (lowercase) with a complete read-only audit (date: 2026-09-28). This `Enhancement-Plan/` integrates and extends that audit with actual implementation tracking.

## Project Identity
Name: child-mapping-system
Framework: Next.js 16.3.5 (App Router, React 19.2.8)
Database: SQLite via Drizzle ORM + @libsql/client
Auth: Cookie-based session (bcrypt, custom RBAC)
Deployment: Vercel-ready (`.vercel/` exists)
Package Manager: pnpm / npm (lockfile + pnpm-lock.yaml)

## Non-Negotiable Rules Applied
- No `.env` read/print
- No secret exposure
- Existing business logic preserved
- UI/theme preserved (Fira Sans/Code, civic navy + action blue)
- No unnecessary `use client`
- No premature abstractions
