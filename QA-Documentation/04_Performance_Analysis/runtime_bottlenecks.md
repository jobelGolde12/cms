# Runtime Bottlenecks

- Database: uses Turso/libSQL; no unbounded SELECT * observed
- Reports: buildReport uses scoped queries; pagination not needed (limit 2000/1000/500 per report type)
- Image optimization: standard Next.js behavior
- Client JS: minimal; View Report uses server-rendered page
