export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-8">Page not found</p>
        <a
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-800 px-6 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}