# Security handoff — `.env` removal from git (2026-09-26)

**Read this fully. The automation part is done; the human actions below are NOT optional.**

## What was done

1. **Untracked `.env`** on both affected branches. The local file was kept on disk for development.
2. **`.gitignore` already contained `.env*`** — verified active: `.env`, `.env.local`, `.env.production`, `.env.development` are all ignored.
3. **Rewrote history** with `git filter-repo --invert-paths --path .env --force`, so no commit on any branch contains `.env` anymore.
4. **Force-pushed** the rewritten branches to `origin` (this was required — a normal push is impossible after a history rewrite).
5. **Purged the old blob from the local object store.** The last anchor turned out to be a staged `.env` in the linked worktree `.kilo/worktrees/wry-lychee` — its index was reset (file kept on disk) and the object store was garbage-collected.
6. **Backups taken before the rewrite** (kept locally, contain the pre-rewrite history):
   - `/tmp/cms-pre-scrub-backup.bundle` — full `git bundle --all` snapshot
   - `/tmp/wip-backup.patch` — uncommitted README / login-page WIP (also restored to the working tree)

## Verification results

- `git log --all -- <path>` for `.env` → no commits
- `git ls-tree origin/main2` → `.env` not in the served tree
- `.env` blob (sha256 prefix `f0a0faa…`) → absent from the local object store after gc
- `add-responsive` branch → never contained `.env`; untouched
- No secret values were printed, logged, or committed at any step

## ⚠️ What the human MUST still do

### 1. Rotate every secret that was in `.env` — treat them as compromised
The file was pushed to GitHub in `69eeb87` ("env: add production env vars for Vercel deploy") and served by that platform until the history rewrite. Assume bots scraped it. Rotate at minimum:
- `TURSO_AUTH_TOKEN` / `LIBSQL_AUTH_TOKEN` — rotate in the Turso dashboard, then update Vercel env vars
- Any `AUTH_SECRET` / session / JWT secrets — regenerate
- Any API keys in the file (email, SMS, analytics, etc.)
- Database URLs themselves are identifiers; rotate the credentials in them

After rotating: `vercel env pull` is **not** needed — update values in the Vercel dashboard and redeploy.

### 2. Contact GitHub Support to purge cached views
Even after a force-push, GitHub may serve old data from caches for a while. Request a garbage-collection / cache purge:
- https://support.github.com/contact — ask them to remove cached views of `.env` from `jobelGolde12/cms` (mention the force-push and attach this context).
- Until GitHub confirms, assume commit `69eeb87` (old SHA) may still be fetchable by direct SHA.

### 3. Coordinate the force-push with collaborators
All commit SHAs changed. Anyone with an existing clone must re-clone or run:
```bash
git fetch origin
git checkout main
git reset --hard origin/main
# same for main2
```
Old clones still contain the pre-rewrite history and the secrets.

### 4. Guard against recurrence
- Consider adding a pre-commit hook (e.g. `gitleaks` or `git-secrets`) so `.env` or key material can never be committed again.
- Keep using `.env.example` with placeholder values only for documentation.

### 5. Delete the local backups once rotation is confirmed
`/tmp/cms-pre-scrub-backup.bundle` and `/tmp/wip-backup.patch` contain the pre-rewrite history (with `.env`). Delete them after you have verified the new secrets are deployed and working.
