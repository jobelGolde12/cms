export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        <h1 className="text-xl font-extrabold text-brand-900 mb-2">Page not found</h1>
        <p className="text-brand-500">The page you are looking for does not exist.</p>
      </div>
    </main>
  );
}
