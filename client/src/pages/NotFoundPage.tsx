import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="surface-card animate-page-enter mx-auto mt-20 max-w-xl p-8 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-brand-900">Page not found</h1>
      <p className="mt-2 text-sm text-brand-700/80">The page you requested does not exist in this HR CRM workspace.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
