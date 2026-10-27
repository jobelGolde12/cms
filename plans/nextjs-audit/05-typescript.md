# TypeScript Review

## Configuration
- `tsconfig.json`: strict mode enabled (`"strict": true`), `noEmit: true`, `isolatedModules: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `paths`: `@/*` → `./src/*`.
- `skipLibCheck: true` — acceptable for build speed but may hide library type errors.
- `allowJs: true` — some `.js` files may be included; prefer `.ts`/`.tsx`.

## Type Quality
- `any` usage: must grep for `any` across `src/`.
- `@ts-ignore` / `@ts-expect-error`: must grep for these suppressions.
- Non-null assertions (`!`): common with Drizzle and React props; should be minimized.
- `unknown` usage: verify that `unknown` is used correctly (not just `any` replacement).

## Key Types
- `Role`, `Permission`, `StudentStatus`, `RecordStatus`, etc., defined in `constants.ts` and exported. Good.
- `SessionUser` defined in `auth.ts`; good for auth layer.
- `NavLink` and other component props typed locally.
- No centralized `types/` directory; types are co-located with modules or in `constants.ts`.

## Schema Types
- `GRADES_STATUSES` and `GradeStatus` defined in `db/schema.ts`; schema-derived types may not be exported separately. Consider generating types from schema (`drizzle-type-generator` or manual interfaces) for stronger API contracts.

## Form Types
- Forms likely use `zod` schemas; inspect whether form types are derived from schemas (`z.infer<typeof Schema>`). This is the recommended pattern.

## Runtime Validation
- TypeScript does not validate runtime input. Every form, action parameter, and route handler parameter needs runtime validation (`zod` or similar).
- `env-validation.ts` validates environment variables at runtime; good.
- `route.ts` handlers should validate `params` and query parameters at runtime; verify.

## Type Safety Improvements
- Replace any remaining `any` with specific types.
- Derive form types from `zod` schemas.
- Export database model types from schema for reuse in components.
- Add strict typing to route handler responses (`Response` type or JSON type).
