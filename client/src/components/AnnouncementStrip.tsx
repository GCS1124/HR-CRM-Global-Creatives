import { ArrowRight, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import type { Announcement } from "../types/hr";

interface AnnouncementStripProps {
  announcements: Announcement[];
  loading?: boolean;
}

const toneMap: Record<Announcement["tone"], string> = {
  info: "border-sky-200/70 bg-sky-50/80 text-sky-900",
  success: "border-emerald-200/70 bg-emerald-50/80 text-emerald-900",
  warning: "border-amber-200/70 bg-amber-50/80 text-amber-900",
  critical: "border-rose-200/70 bg-rose-50/80 text-rose-900",
};

export function AnnouncementStrip({ announcements, loading = false }: AnnouncementStripProps) {
  if (loading) {
    return (
      <section className="mt-6 rounded-[28px] border border-white/45 bg-white/72 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-sm font-semibold text-slate-700">Loading workspace updates...</p>
      </section>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[32px] border border-white/45 bg-white/68 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-slate-100 shadow-[0_14px_34px_rgba(15,23,42,0.18)]">
          <Megaphone className="h-4 w-4 text-slate-100" />
        </span>
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-brand-800">Workspace Broadcasts</p>
          <h2 className="text-lg font-semibold text-slate-950">What changed and what needs action</h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {announcements.slice(0, 3).map((announcement) => (
          <article
            key={announcement.id}
            className={`rounded-[24px] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ${toneMap[announcement.tone]}`}
          >
            <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-600">
              {announcement.audience === "all" ? "All workspaces" : `${announcement.audience} workspace`}
            </p>
            <h3 className="mt-3 text-base font-semibold text-slate-950">{announcement.title}</h3>
            <p className="mt-2 text-sm font-medium text-slate-700">{announcement.message}</p>
            {announcement.ctaLabel && announcement.ctaPath ? (
              <Link
                to={announcement.ctaPath}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition hover:opacity-80"
              >
                {announcement.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
