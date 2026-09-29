# Caching Strategy

## What to Cache
1. `getCurrentUser()` — already uses React `cache()` per request
2. Reference data (roles, permissions, municipalities, barangays, schools) — cache with 5-minute TTL
3. Dashboard aggregates — cache with 1-minute TTL (data changes frequently)
4. Child profile data — cache with 2-minute TTL; invalidate on mutation
5. Report filters / results — no cache (user-specific, dynamic filters)

## Invalidation Strategy
- Mutations (create/update/delete) must call `revalidatePath()` for affected routes
- Reference data mutations must clear reference cache explicitly
- Child mutations must revalidate `/children`, `/children/[id]`, `/dashboard`

## Implementation
- Use `unstable_cache()` or `next` cache tags for reference data
- Keep request-level `cache()` for user session
- Do NOT cache user-specific data globally (prevent data isolation issues)
