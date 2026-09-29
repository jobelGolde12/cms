# Frontend Performance
- Component tree: many Server Components are already server-rendered; client components limited to interactive parts (forms, buttons, navigation)
- No lazy loading of heavy components (e.g., reports, charts) — could use dynamic `import()` for `/reports` and `/dashboard` charts
- Font loading optimized with `next/font/google` and `display: swap`
- No skeleton loading states for list pages
- Client-side navigation: Next.js Link used; no unnecessary full reloads
