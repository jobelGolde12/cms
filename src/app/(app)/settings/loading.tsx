export default function SettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-32 animate-pulse rounded bg-brand-200/70" />
          <div className="h-7 w-48 animate-pulse rounded bg-brand-200/70" />
          <div className="h-3.5 w-80 max-w-full animate-pulse rounded bg-brand-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 animate-pulse rounded bg-brand-200/70" />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2 w-20 animate-pulse rounded bg-brand-200/70" />
                  <div className="h-9 w-36 animate-pulse rounded bg-brand-200/70" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
