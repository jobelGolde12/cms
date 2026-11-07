# AI-Assisted Student Records — Implementation Documentation

Implemented per the approved plan (`plan/ai-assisted-student-records-implementation-plan.md`).
All AI functionality is decision support for authorized employees; it never
mutates student records, makes decisions, or reaches the browser with credentials.

## Architecture

```
UI (shared panel component)
  ↓ useActionState
Server Actions (src/actions/ai.ts)      ← authorization + scope + rate limit live here
  ↓ already-authorized rows via existing query getters (src/lib/queries.ts)
Pure fact/context builders (src/lib/ai/context-student.ts)   ← authoritative "facts"
Provider adapter (src/lib/ai/provider.ts)                     ← fetch-only, no SDK
  ↓ Zod schema validation (src/lib/ai/schemas.ts)             ← malformed ⇒ rejected
Server actions return { facts, validated result, scopeNote }  ← nothing persisted
```

Safety contracts baked into every prompt (`src/lib/ai/prompts.ts`):

1. **Source discipline** — the model may use only the JSON payload; missing data
   must be acknowledged in `warnings`, never invented.
2. **Data framing** — every database field is inside a `<data>` block explicitly
   marked DATA-ONLY; instruction-like text inside records is never followed.
3. **No decisions** — no diagnoses, no disciplinary verdicts, no duplicate
   merge/mark decisions, no mandatory intervention orders.
4. **Fact/interpretation split** — numeric facts are computed server-side and
   rendered verbatim in the UI; the model only narrates.

## Files

**Created**

- `src/lib/ai/provider.ts` — dependency-free provider adapter (anthropic/openai
  via fetch), 20 s timeout, one retry, Zod-validated JSON, in-process rate limit
  (8 requests / 5 min / user), `AI_ENABLED` kill switch, friendly classified
  errors (timeout / network / rate limit / credentials / unusable response).
- `src/lib/ai/schemas.ts` — one Zod output schema per feature; bounded strings;
  every result carries `confidence` and `warnings[]`.
- `src/lib/ai/prompts.ts` — system prompts per feature with the role label;
  `<data>` framing; per-feature field lists and rules.
- `src/lib/ai/context-student.ts` — pure fact builders from already-authorized
  rows: per-period/per-subject grade aggregates (below-75 counts), attendance
  tallies (explicit window), behavior categories/severity, assessment levels,
  interventions, health. Long feeds are truncated with explicit disclosures.
  **Minimization**: the model sees "Student <studentNumber>" + age-in-years,
  never names, birth dates, addresses, or guardian contacts.
- `src/actions/ai.ts` — the seven authorized server actions (below).
- `src/components/ai/ai-analysis-panel.tsx` — native-looking shared panel:
  trigger button (self-disabling while pending), skeleton loading, Database
  facts section (server-computed, verbatim), clearly labelled "AI-generated
  (review before use)" sections, editable/regenerable narrative, copy,
  discard, warnings area, scope note. Uses the existing card/button tokens;
  no AI-branded gradients or chat UI.
- Tests: `src/actions/__tests__/ai-actions.test.ts` (39 integration tests),
  `src/lib/ai/__tests__/context-student.test.ts`,
  `src/lib/ai/__tests__/schemas-provider.test.ts`.

**Modified (integration points)**

- `src/app/(app)/students/[id]/page.tsx` — Summarize this Student +
  Analyze Performance (grades-view roles) + Suggest Possible Interventions
  (student-development roles)`.
- `src/app/(app)/guidance/incidents/[id]/edit/page.tsx` — Draft follow-up note + Case-history summary (Guidance role set only).
- `src/app/(app)/duplicates/page.tsx` — "Explain evidence with AI" on the
  selected candidate (evidence narration only; the human decision buttons and
  the existing `reviewDuplicate` workflow are untouched).
- `src/app/(app)/dashboard/page.tsx` — "Summarize this overview" narrative for
  dashboard/report roles (excludes the admin-officer employee workspace).

## Server actions and permission matrix

Every action re-runs `getAuthorizedUser(permission)` **and** the row-level
scope checks (`canAccessStudent`, `canViewConfidentialBehavior`,
`canViewStudentDevelopment`) server-side; UI buttons are cosmetic only.

| Action | Feature | Permission gate | Roles allowed |
|---|---|---|---|
| `summarizeStudent` | Phase 1 | `students.view` + row scope | admin, school_admin, subject_teacher (own sections), teacher (own sections), records, guidance, nurse, registrar, literacy_coordinator |
| `analyzeStudentPerformance` | Phase 2 | `grades.view` + row scope | admin, school_admin, subject_teacher*, teacher*, records, registrar |
| `summarizeGuidanceCase` | Phase 3 | `behavior.view` **and** confidential scope | admin, school_admin, guidance |
| `draftGuidanceFollowUp` | Phase 3 | same as above, per-incident lookup via `getGuidanceIncident(user, id)` | admin, school_admin, guidance |
| `suggestInterventions` | Phase 4 | `interventions.view` **and** `canViewStudentDevelopment` | admin, school_admin, teacher*, literacy_coordinator |
| `explainDuplicateEvidence` | Phase 5 | `duplicates.view` | admin, school_admin, records |
| `summarizeDashboard` | Phase 6 | `dashboard.view` + `reports.view`, not admin_officer | admin, school_admin, teacher*, subject_teacher*, records, registrar, literacy_coordinator |

\* teaching roles additionally limited to students in their assigned sections
(adviser loads / `section_subject_teachers`); a manipulated `studentId` is
re-checked row-by-row and rejected.

Denied families (enforced in the actions themselves):

- Nurse: no guidance AI, no performance, no suggestions, no duplicates, no
  dashboard summary; student summary contains ONLY profile + health domains.
- Registrar: no guidance AI (not in the confidential role set); no suggestions.
- Guidance: no performance/suggestions/dashboard summary (Student Development
  and Reports are outside the role's domain per the 2026-11 least-privilege rule).
- Admin Officer: no student AI at all (row-scope `1=0` + explicit exclusion).

## Audit trail

Each successful generation appends one `audit_logs` row:
`AI_SUMMARY_GENERATED`, `AI_PERFORMANCE_ANALYZED`,
`AI_GUIDANCE_CASE_SUMMARIZED`, `AI_GUIDANCE_NOTE_DRAFTED`,
`AI_SUGGESTIONS_GENERATED`, `AI_DUPLICATE_EVIDENCE_GENERATED`,
`AI_REPORT_SUMMARIZED` — with `{ feature, role }` only. Prompts, payloads,
injected record text, and secrets are never logged.

## Database

**No schema changes, no migrations.** AI reads existing tables through the
existing query getters and never writes to any domain table (verified by
integration tests that diff every table's row count and values across an AI
call; only `audit_logs` changes). Duplicate review keeps using the existing
`duplicate_candidates` + record-status workflow; the AI cannot merge, mark, or
delete anything.

## Environment variables

- `AI_PROVIDER` — `anthropic` (default) | `openai`
- `AI_API_KEY` — server-side key (accepts `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`);
  unset ⇒ AI features return a friendly "not configured" error
- `AI_MODEL`, `AI_BASE_URL` — optional overrides
- `AI_ENABLED=false` — runtime kill switch

All are documented (commented) in `.env.example`; the real key lives only in
`.env` (server-side), never in client bundles.

## Testing performed (summary)

- 3 new test files, 78 tests: **all passing**.
- Auth matrix: every role × every action, in both allow and deny directions,
  including teacher/subject_teacher row-scope (IDOR by manipulated student id),
  unauthenticated calls, and unknown ids.
- Confidentiality: confidential incident text never appears in payloads for
  non-confidential roles; it DOES appear only for the authorized guidance set.
- Data minimization: nurse's summary payload contains no grade/subject detail.
- Prompt injection: a poisoned record description travels as DATA; the system
  contract explicitly disarms instruction-following; the text is never stored.
- Integrity: AI actions never modify students/grades/behavior/assessments/
  interventions/duplicate candidates (count + status diffs across calls).
- Malformed output ⇒ friendly retryable error, never a crash or partial trust.
- Rate limit: the 9th request inside the window is rejected locally before any
  provider call.
- Regression: full suite `pnpm test` → 23 files / 298 tests passing (includes
  all pre-existing suites). `pnpm lint` clean, `tsc --noEmit` clean,
  `pnpm build` succeeds. Production Turso table counts unchanged from baseline.

## Known limitations

1. The rate limiter is in-process (single-instance). Multi-instance deployments
   would need a shared store (not required by the current single-server setup).
2. There is no response cache — regenerate always re-requests the provider
   (data stays fresh; cost is controlled by the rate limit and token caps).
3. Model quality depends on the configured provider; the schemas reject
   malformed/hallucinated output rather than judging semantics.
4. Dashboard summary covers the role-scoped KPI/distribution counts the
   dashboard already renders; it does not summarize opening or chart-internal
   drill-downs.
