export default function HealthLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-2.5 w-24 animate-pulse rounded bg-brand-100" />
        <div className="mt-2 h-7 w-64 animate-pulse rounded bg-brand-100" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-brand-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-brand-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-brand-100" />
    </div>
  );
}
