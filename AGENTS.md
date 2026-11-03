# AI Agent Security Rules

## Sensitive files — NEVER READ
The agent must never open, read, print, inspect, parse, copy, or expose the contents of:

- .env
- .env.*
- .env.local
- .env.development
- .env.production
- .env.test
- *.pem
- *.key
- *.crt
- credentials.json
- service-account.json
- secrets.json
- token files
- SSH keys
- database credential files
- API keys
- authentication secrets
- private certificates

If a task requires information from one of these files, stop and ask the user instead of reading it.

## Sensitive directories — NEVER READ

- .git/
- .ssh/
- node_modules/
- .next/
- coverage/
- logs/
- backups/

Do not search these directories for information.

## Allowed project operations

The agent may:

- Read source code
- Read configuration files that do not contain secrets
- Create files
- Modify source code
- Delete project files when explicitly required
- Run tests
- Run lint
- Run type checking
- Run database migrations
- Run development/build commands
- Install dependencies when necessary
- Inspect project structure
- Use only Turso database not use local DB

## Environment variables

Never obtain secret values from `.env`.

When code requires an environment variable, only use its variable name.

Example:

process.env.DATABASE_URL

The agent may verify that the variable is referenced correctly, but must not read or reveal its value.

## Command execution

The agent may execute normal project-development commands such as:

npm install
npm run dev
npm run build
npm run lint
npm run test
npx tsc --noEmit
npx prisma migrate
git status
git diff

Never execute commands intended to expose secrets, such as:

cat .env
less .env
printenv
env
export
grep -R "API_KEY" .
grep -R "PASSWORD" .
git log -p
git show

## Secret handling

Never place secrets directly into source code.

Never print secrets into the terminal.

Never include secret values in generated documentation.

Never include secret values in AI responses.

If a file or folder is not needed to push in github repo it will add in .gitignore.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
