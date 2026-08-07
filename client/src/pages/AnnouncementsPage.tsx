import { type ChangeEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Megaphone,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { AnnouncementAudience, InsightTone } from "../types/hr";

const announcementAudienceOptions: Array<{ value: AnnouncementAudience; label: string; description: string }> = [
  {
    value: "all",
    label: "All workspaces",
    description: "Visible in both admin and employee announcement strips.",
  },
  {
    value: "admin",
    label: "Admin workspace",
    description: "Shown only in the admin dashboard feed.",
  },
  {
    value: "employee",
    label: "Employee workspace",
    description: "Shown only in the employee dashboard feed.",
  },
];

const announcementToneOptions: Array<{ value: InsightTone; label: string; description: string }> = [
  { value: "info", label: "Info", description: "Neutral updates and operational notes." },
  { value: "success", label: "Success", description: "Wins, launches, and positive milestones." },
  { value: "warning", label: "Warning", description: "Time-sensitive reminders or action items." },
  { value: "critical", label: "Critical", description: "Escalations that need immediate attention." },
];

const announcementToneSurface: Record<InsightTone, string> = {
  info: "border-sky-200 bg-sky-50/90 text-sky-950",
  success: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
  warning: "border-amber-200 bg-amber-50/90 text-amber-950",
  critical: "border-rose-200 bg-rose-50/90 text-rose-950",
};

const maxAnnouncementGraphicBytes = 5 * 1024 * 1024;

const defaultAnnouncementDraft = {
  audience: "all" as AnnouncementAudience,
  title: "",
  message: "",
  tone: "info" as InsightTone,
  graphicUrl: "",
  graphicAlt: "",
  ctaLabel: "",
  ctaPath: "",
};

type AnnouncementDraft = typeof defaultAnnouncementDraft;

type SelectedGraphicFile = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

function humanizeFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

  if (!baseName) {
    return "Workspace announcement graphic";
  }

  return baseName.replace(/\s+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected image."));
    };

    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function AnnouncementsPage() {
  const announcementsHook = useApi(useCallback(() => hrService.getAllAnnouncements(), []));
  const graphicFileInputRef = useRef<HTMLInputElement | null>(null);
  const graphicReadTokenRef = useRef(0);
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft>(defaultAnnouncementDraft);
  const [selectedGraphicFile, setSelectedGraphicFile] = useState<SelectedGraphicFile | null>(null);
  const [graphicUploadPending, setGraphicUploadPending] = useState(false);
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [announcementMessage, setAnnouncementMessage] = useState<string | null>(null);

  const updateAnnouncementDraft = <K extends keyof AnnouncementDraft>(field: K, value: AnnouncementDraft[K]) => {
    setAnnouncementError(null);
    setAnnouncementMessage(null);
    setAnnouncementDraft((current) => ({ ...current, [field]: value }));
  };

  const announcementList = useMemo(() => announcementsHook.data ?? [], [announcementsHook.data]);
  const announcementPreviewTitle = announcementDraft.title.trim() || "Draft announcement";
  const announcementPreviewMessage = announcementDraft.message.trim() || "Add a short update for the workspace feed.";
  const announcementPreviewGraphicUrl = selectedGraphicFile?.dataUrl ?? announcementDraft.graphicUrl.trim();
  const announcementPreviewGraphicAlt =
    announcementDraft.graphicAlt.trim() || (selectedGraphicFile ? humanizeFileName(selectedGraphicFile.name) : announcementPreviewTitle) || "Workspace announcement graphic";
  const announcementPreviewCtaLabel = announcementDraft.ctaLabel.trim();
  const announcementPreviewCtaPath = announcementDraft.ctaPath.trim();
  const announcementPreviewAudience = announcementAudienceOptions.find((item) => item.value === announcementDraft.audience);
  const announcementPreviewTone = announcementToneOptions.find((item) => item.value === announcementDraft.tone);
  const announcementGraphicSourceLabel = selectedGraphicFile
    ? `Uploaded file · ${selectedGraphicFile.name} · ${formatFileSize(selectedGraphicFile.size)}`
    : announcementDraft.graphicUrl.trim()
      ? "Remote URL"
      : "No image selected";

  const announcementStats = useMemo(() => {
    const total = announcementList.length;
    const graphics = announcementList.filter((item) => Boolean(item.graphicUrl)).length;
    const allWorkspace = announcementList.filter((item) => item.audience === "all").length;

    return { total, graphics, allWorkspace };
  }, [announcementList]);

  const handleResetAnnouncementDraft = () => {
    setAnnouncementDraft(defaultAnnouncementDraft);
    setAnnouncementError(null);
    setAnnouncementMessage(null);
    setSelectedGraphicFile(null);
    setGraphicUploadPending(false);
    graphicReadTokenRef.current += 1;

    if (graphicFileInputRef.current) {
      graphicFileInputRef.current.value = "";
    }
  };

  const handleClearGraphicFile = () => {
    setAnnouncementError(null);
    setAnnouncementMessage(null);
    setSelectedGraphicFile(null);
    setGraphicUploadPending(false);
    graphicReadTokenRef.current += 1;

    if (graphicFileInputRef.current) {
      graphicFileInputRef.current.value = "";
    }
  };

  const handleGraphicFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      handleClearGraphicFile();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAnnouncementError("Please choose a PNG, JPG, GIF, or WebP image.");
      setAnnouncementMessage(null);
      event.target.value = "";
      return;
    }

    if (file.size > maxAnnouncementGraphicBytes) {
      setAnnouncementError(`Image must be ${formatFileSize(maxAnnouncementGraphicBytes)} or smaller.`);
      setAnnouncementMessage(null);
      event.target.value = "";
      return;
    }

    const token = graphicReadTokenRef.current + 1;
    graphicReadTokenRef.current = token;

    setGraphicUploadPending(true);
    setAnnouncementError(null);
    setAnnouncementMessage(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      if (graphicReadTokenRef.current !== token) {
        return;
      }

      setSelectedGraphicFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      });

      setAnnouncementDraft((current) => {
        if (current.graphicAlt.trim()) {
          return current;
        }

        return {
          ...current,
          graphicAlt: humanizeFileName(file.name),
        };
      });
    } catch (error) {
      if (graphicReadTokenRef.current !== token) {
        return;
      }

      setSelectedGraphicFile(null);
      setAnnouncementError(error instanceof Error ? error.message : "Unable to read the selected image.");
      event.target.value = "";
    } finally {
      if (graphicReadTokenRef.current === token) {
        setGraphicUploadPending(false);
      }
    }
  };

  const handlePublishAnnouncement = async () => {
    const title = announcementDraft.title.trim();
    const message = announcementDraft.message.trim();
    const graphicUrl = selectedGraphicFile?.dataUrl ?? announcementDraft.graphicUrl.trim();
    const graphicAlt = announcementDraft.graphicAlt.trim() || (selectedGraphicFile ? humanizeFileName(selectedGraphicFile.name) : null);
    const ctaLabel = announcementDraft.ctaLabel.trim();
    const ctaPath = announcementDraft.ctaPath.trim();

    if (!title || !message) {
      setAnnouncementError("Title and message are required before publishing.");
      return;
    }

    setPublishingAnnouncement(true);
    setAnnouncementError(null);
    setAnnouncementMessage(null);

    try {
      await hrService.createAnnouncement({
        audience: announcementDraft.audience,
        title,
        message,
        tone: announcementDraft.tone,
        graphicUrl: graphicUrl || null,
        graphicAlt,
        ctaLabel: ctaLabel || null,
        ctaPath: ctaPath || null,
      });
      await announcementsHook.refetch();
      setAnnouncementDraft(defaultAnnouncementDraft);
      setSelectedGraphicFile(null);
      setGraphicUploadPending(false);
      graphicReadTokenRef.current += 1;

      if (graphicFileInputRef.current) {
        graphicFileInputRef.current.value = "";
      }
      setAnnouncementMessage("Announcement published to the workspace feed.");
    } catch (issue) {
      setAnnouncementError(issue instanceof Error ? issue.message : "Unable to publish announcement.");
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  if (announcementsHook.loading && announcementList.length === 0) {
    return <p className="text-sm font-semibold text-slate-600">Loading announcements...</p>;
  }

  if (announcementsHook.error && announcementList.length === 0) {
    return <p className="text-sm font-semibold text-rose-700">{announcementsHook.error}</p>;
  }

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Publish text updates or upload a local image for the workspace announcement strips. This page is separate from policy settings so content stays organized."
        eyebrow="Admin Communication"
        action={
          <button type="button" onClick={() => void announcementsHook.refetch()} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Refresh feed
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Live posts" value={String(announcementStats.total)} icon={Megaphone} hint="Published workspace updates" accent />
        <StatCard title="Graphic posts" value={String(announcementStats.graphics)} icon={ImageIcon} hint="Posts with visual banners" />
        <StatCard title="All-workspace posts" value={String(announcementStats.allWorkspace)} icon={Users} hint="Visible to both workspaces" />
      </div>

      <SectionCard
        title="Workspace announcement studio"
        subtitle="Compose the message once, optionally upload a local image or attach a graphic URL, and publish it to the selected workspace audience."
        rightSlot={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Live composer
          </span>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-brand-800">
                <Megaphone className="h-3.5 w-3.5" />
                Publish update
              </span>
              <span className="text-xs font-semibold text-slate-500">Create a post that can target all users, admins only, or employees only.</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</label>
                <select
                  value={announcementDraft.audience}
                  onChange={(event) => updateAnnouncementDraft("audience", event.target.value as AnnouncementAudience)}
                  className="input-surface w-full"
                >
                  {announcementAudienceOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {announcementAudienceOptions.find((item) => item.value === announcementDraft.audience)?.description}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tone</label>
                <select
                  value={announcementDraft.tone}
                  onChange={(event) => updateAnnouncementDraft("tone", event.target.value as InsightTone)}
                  className="input-surface w-full"
                >
                  {announcementToneOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {announcementToneOptions.find((item) => item.value === announcementDraft.tone)?.description}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
                <input
                  value={announcementDraft.title}
                  onChange={(event) => updateAnnouncementDraft("title", event.target.value)}
                  placeholder="Quarterly launch update"
                  className="input-surface w-full"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</label>
                <textarea
                  value={announcementDraft.message}
                  onChange={(event) => updateAnnouncementDraft("message", event.target.value)}
                  placeholder="Write the update that should appear in the workspace announcement strip."
                  className="input-surface min-h-[140px] w-full resize-y"
                />
              </div>
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Graphic asset</label>
                      <p className="mt-2 text-xs text-slate-500">
                        Upload an image from your device or paste a remote URL. Local uploads are stored with the announcement.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={graphicFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleGraphicFileChange(event)}
                      />
                      <button
                        type="button"
                        onClick={() => graphicFileInputRef.current?.click()}
                        className="btn-secondary"
                        disabled={graphicUploadPending}
                      >
                        <Upload className="h-4 w-4" />
                        {graphicUploadPending ? "Loading..." : "Choose file"}
                      </button>
                      {selectedGraphicFile ? (
                        <button type="button" onClick={handleClearGraphicFile} className="btn-secondary">
                          <X className="h-4 w-4" />
                          Clear file
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-600">
                      {announcementGraphicSourceLabel}
                    </span>
                    {selectedGraphicFile ? (
                      <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-brand-800">
                        Local image selected
                      </span>
                    ) : null}
                  </div>
                  {selectedGraphicFile ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {selectedGraphicFile.type || "image"} · {formatFileSize(selectedGraphicFile.size)} · This file will be embedded when you publish.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No file selected yet. Use the button above or paste a URL below.</p>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Graphic URL fallback</label>
                <input
                  value={announcementDraft.graphicUrl}
                  onChange={(event) => updateAnnouncementDraft("graphicUrl", event.target.value)}
                  placeholder="https://.../banner.png"
                  className="input-surface w-full"
                />
                <p className="mt-2 text-xs text-slate-500">Used when you do not choose a local file.</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Graphic alt text</label>
                <input
                  value={announcementDraft.graphicAlt}
                  onChange={(event) => updateAnnouncementDraft("graphicAlt", event.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="input-surface w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">CTA label</label>
                <input
                  value={announcementDraft.ctaLabel}
                  onChange={(event) => updateAnnouncementDraft("ctaLabel", event.target.value)}
                  placeholder="Open dashboard"
                  className="input-surface w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">CTA path</label>
                <input
                  value={announcementDraft.ctaPath}
                  onChange={(event) => updateAnnouncementDraft("ctaPath", event.target.value)}
                  placeholder="/admin"
                  className="input-surface w-full"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {announcementError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{announcementError}</p> : null}
              {announcementMessage ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{announcementMessage}</p> : null}
              <p className="text-xs font-medium text-slate-500">
                Graphics are optional. If you skip the image, the strip stays text-first and still uses the tone and CTA.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handlePublishAnnouncement()}
                disabled={publishingAnnouncement || !announcementDraft.title.trim() || !announcementDraft.message.trim()}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {publishingAnnouncement ? "Publishing..." : "Publish announcement"}
              </button>
              <button type="button" onClick={handleResetAnnouncementDraft} className="btn-secondary">
                <RotateCcw className="h-4 w-4" />
                Reset draft
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`overflow-hidden rounded-[28px] border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${announcementToneSurface[announcementDraft.tone]}`}>
              {announcementPreviewGraphicUrl ? (
                <div className="overflow-hidden rounded-[20px] border border-white/60 bg-white/75 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                  <img src={announcementPreviewGraphicUrl} alt={announcementPreviewGraphicAlt} className="h-40 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-[20px] border border-dashed border-white/70 bg-white/45 px-4 text-center">
                  <div>
                    <ImageIcon className="mx-auto h-8 w-8 text-slate-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Add a graphic URL for a richer card.</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Text-only announcements still work without an image.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-700">
                  {announcementPreviewAudience?.label ?? announcementDraft.audience}
                </span>
                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-700">
                  {announcementPreviewTone?.label ?? announcementDraft.tone}
                </span>
                {selectedGraphicFile ? (
                  <span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-700">
                    Local upload
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{announcementPreviewTitle}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">{announcementPreviewMessage}</p>
              {announcementPreviewCtaLabel && announcementPreviewCtaPath ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-sm">
                  <span>{announcementPreviewCtaLabel}</span>
                  <span className="text-slate-400">{announcementPreviewCtaPath}</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">Recent posts</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">What is already live in the feed</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-600">
                  {announcementList.length} items
                </span>
              </div>

              {announcementsHook.loading && announcementList.length === 0 ? (
                <p className="mt-4 text-sm font-semibold text-slate-600">Loading announcements...</p>
              ) : announcementsHook.error ? (
                <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{announcementsHook.error}</p>
              ) : announcementList.length === 0 ? (
                <p className="mt-4 text-sm font-medium text-slate-600">No announcements yet. Publish one from the composer on the left.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {announcementList.slice(0, 5).map((announcement) => {
                    const audienceLabel = announcementAudienceOptions.find((item) => item.value === announcement.audience)?.label ?? announcement.audience;
                    const toneLabel = announcementToneOptions.find((item) => item.value === announcement.tone)?.label ?? announcement.tone;

                    return (
                      <article key={announcement.id} className={`rounded-[22px] border p-3 ${announcementToneSurface[announcement.tone]}`}>
                        <div className="flex gap-3">
                          {announcement.graphicUrl ? (
                            <img
                              src={announcement.graphicUrl}
                              alt={announcement.graphicAlt ?? announcement.title}
                              className="h-16 w-16 shrink-0 rounded-[16px] border border-white/70 object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] border border-white/70 bg-white/70">
                              <ImageIcon className="h-5 w-5 text-slate-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-700">
                                {audienceLabel}
                              </span>
                              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-700">
                                {toneLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-950">{announcement.title}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-700">{announcement.message}</p>
                            <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {new Date(announcement.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
