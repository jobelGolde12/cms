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

If a secret is needed, tell the user which environment variable is required without requesting its value unless absolutely necessary.