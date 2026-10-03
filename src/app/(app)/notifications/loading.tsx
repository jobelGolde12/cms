export default function NotificationsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading notifications">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-32 animate-pulse rounded bg-brand-200/70" />
          <div className="h-7 w-48 animate-pulse rounded bg-brand-200/70" />
          <div className="h-3.5 w-72 max-w-full animate-pulse rounded bg-brand-100" />
        </div>
      </div>
      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <ul className="divide-y divide-brand-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <span className="h-3.5 w-48 animate-pulse rounded bg-brand-200/70" />
                <span className="h-5 w-8 animate-pulse rounded-full bg-brand-200/70" />
              </div>
              <div className="mt-1 h-3 w-64 animate-pulse rounded bg-brand-200/70" />
              <div className="mt-0.5 h-2.5 w-24 animate-pulse rounded bg-brand-100" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
