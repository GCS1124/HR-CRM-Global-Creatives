import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { BriefcaseBusiness, CircleDot, Plus, Star } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { RecruitmentKanban } from "../components/RecruitmentKanban";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { Candidate, CandidateStage, NewCandidatePayload } from "../types/hr";
import { formatDate } from "../utils/formatters";

const stageOptions: CandidateStage[] = ["sourced", "interview", "offer", "hired", "rejected"];

const initialForm: NewCandidatePayload = {
  name: "",
  role: "",
  source: "",
  stage: "sourced",
  interviewDate: new Date().toISOString().slice(0, 10),
  rating: 3,
};

export function RecruitmentPage() {
  const candidatesHook = useApi(useCallback(() => hrService.getCandidates(), []));
  const [formState, setFormState] = useState<NewCandidatePayload>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<CandidateStage | "">("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortMode, setSortMode] = useState<"interview_soon" | "interview_late" | "rating" | "name">("interview_soon");

  const stageCount = useMemo(() => {
    const list = candidatesHook.data ?? [];

    return {
      sourced: list.filter((item) => item.stage === "sourced").length,
      interview: list.filter((item) => item.stage === "interview").length,
      offer: list.filter((item) => item.stage === "offer").length,
      hired: list.filter((item) => item.stage === "hired").length,
      rejected: list.filter((item) => item.stage === "rejected").length,
    };
  }, [candidatesHook.data]);

  const filteredCandidates = useMemo(() => {
    const list = candidatesHook.data ?? [];
    const query = search.trim().toLowerCase();

    const filtered = list.filter((candidate) => {
      const matchesSearch = query
        ? [candidate.name, candidate.role, candidate.source].join(" ").toLowerCase().includes(query)
        : true;
      const matchesStage = stageFilter ? candidate.stage === stageFilter : true;
      const matchesSource = sourceFilter ? candidate.source === sourceFilter : true;
      return matchesSearch && matchesStage && matchesSource;
    });

    const safeDate = (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.valueOf()) ? null : parsed;
    };

    filtered.sort((left, right) => {
      if (sortMode === "rating") {
        return right.rating - left.rating;
      }

      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }

      const leftDate = safeDate(left.interviewDate);
      const rightDate = safeDate(right.interviewDate);
      if (!leftDate || !rightDate) {
        return 0;
      }

      return sortMode === "interview_late"
        ? rightDate.valueOf() - leftDate.valueOf()
        : leftDate.valueOf() - rightDate.valueOf();
    });

    return filtered;
  }, [candidatesHook.data, search, sortMode, sourceFilter, stageFilter]);

  const upcomingInterviews = useMemo(() => {
    const list = candidatesHook.data ?? [];
    const today = new Date();
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 14);

    return list
      .filter((candidate) => {
        if (candidate.stage === "rejected") {
          return false;
        }
        const interviewDate = new Date(candidate.interviewDate);
        if (Number.isNaN(interviewDate.valueOf())) {
          return false;
        }
        return interviewDate >= new Date(today.toDateString()) && interviewDate <= windowEnd;
      })
      .sort((left, right) => new Date(left.interviewDate).valueOf() - new Date(right.interviewDate).valueOf())
      .slice(0, 6);
  }, [candidatesHook.data]);

  const sources = useMemo(() => {
    const list = candidatesHook.data ?? [];
    return Array.from(new Set(list.map((candidate) => candidate.source).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [candidatesHook.data]);

  const hasActiveFilters = Boolean(search || stageFilter || sourceFilter || sortMode !== "interview_soon");

  const handleFormChange = (field: keyof NewCandidatePayload, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: field === "rating" ? Number(value) : value,
    }));
  };

  const handleCreateCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await hrService.createCandidate(formState);
      setFormState(initialForm);
      await candidatesHook.refetch();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to add candidate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = async (candidateId: string, stage: CandidateStage) => {
    setUpdatingCandidateId(candidateId);
    setUpdateError(null);

    try {
      await hrService.updateCandidateStage(candidateId, stage);
      await candidatesHook.refetch();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to update candidate stage.");
    } finally {
      setUpdatingCandidateId(null);
    }
  };

  const columns: Array<TableColumn<Candidate>> = [
    { key: "name", header: "Candidate", render: (row) => row.name },
    { key: "role", header: "Role", render: (row) => row.role },
    { key: "source", header: "Source", render: (row) => row.source },
    { key: "stage", header: "Stage", render: (row) => <StatusBadge value={row.stage} /> },
    { key: "interview", header: "Interview", render: (row) => formatDate(row.interviewDate) },
    {
      key: "rating",
      header: "Rating",
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
          <Star className="h-3.5 w-3.5 fill-current" />
          {row.rating}/5
        </span>
      ),
    },
    {
      key: "actions",
      header: "Selection Status",
      render: (row) => (
        <select
          value={row.stage}
          onChange={(event) => void handleStageChange(row.id, event.target.value as CandidateStage)}
          disabled={updatingCandidateId === row.id}
          className="input-surface min-w-[140px] py-2"
        >
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Recruitment"
        subtitle="Add candidates, track pipeline flow, and update selection stage from one admin surface."
        eyebrow="Talent Acquisition"
      />

      <ModuleHero
        icon={BriefcaseBusiness}
        title="Accelerate Hiring from Sourcing to Offer"
        subtitle="Capture candidate records fast, move them through the pipeline, and keep selection status current for the team."
        chips={["Candidate intake", "Stage control", "Selection tracking"]}
        spotlight={`${stageCount.offer} Offers In Motion`}
      />

      <SectionCard
        title="Talent command bar"
        subtitle="Search and sort the pipeline without leaving the page"
        rightSlot={<span className="insight-pill">{filteredCandidates.length} visible</span>}
      >
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search candidate, role, or source"
            className="input-surface"
          />
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as CandidateStage | "")}
            className="input-surface"
          >
            <option value="">All stages</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </option>
            ))}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="input-surface">
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="input-surface">
            <option value="interview_soon">Sort: interview soonest</option>
            <option value="interview_late">Sort: interview latest</option>
            <option value="rating">Sort: highest rating</option>
            <option value="name">Sort: name A-Z</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStageFilter("")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              stageFilter === "" ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All stages
          </button>
          {stageOptions.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                stageFilter === stage ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {stage.charAt(0).toUpperCase() + stage.slice(1)} · {stageCount[stage]}
            </button>
          ))}
        </div>
        {hasActiveFilters ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setSourceFilter("");
                setSortMode("interview_soon");
              }}
              className="btn-secondary"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Pipeline Stages" subtitle="Current distribution by hiring stage">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Sourced", value: stageCount.sourced, tone: "bg-indigo-500/10 text-indigo-700" },
              { label: "Interview", value: stageCount.interview, tone: "bg-sky-500/10 text-sky-700" },
              { label: "Offer", value: stageCount.offer, tone: "bg-violet-500/10 text-violet-700" },
              { label: "Hired", value: stageCount.hired, tone: "bg-emerald-500/10 text-emerald-700" },
              { label: "Rejected", value: stageCount.rejected, tone: "bg-rose-500/10 text-rose-700" },
            ].map((stage) => (
              <div key={stage.label} className="rounded-xl border border-brand-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">{stage.label}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-display text-3xl font-bold text-brand-900">{stage.value}</p>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${stage.tone}`}>
                    <CircleDot className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Add Candidate" subtitle="Create a new recruitment record">
          <form onSubmit={handleCreateCandidate} className="space-y-3">
            <input
              required
              value={formState.name}
              onChange={(event) => handleFormChange("name", event.target.value)}
              placeholder="Candidate name"
              className="input-surface w-full"
            />
            <input
              required
              value={formState.role}
              onChange={(event) => handleFormChange("role", event.target.value)}
              placeholder="Role"
              className="input-surface w-full"
            />
            <input
              required
              value={formState.source}
              onChange={(event) => handleFormChange("source", event.target.value)}
              placeholder="Source"
              className="input-surface w-full"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={formState.stage}
                onChange={(event) => handleFormChange("stage", event.target.value)}
                className="input-surface w-full"
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>
              <input
                required
                type="date"
                value={formState.interviewDate}
                onChange={(event) => handleFormChange("interviewDate", event.target.value)}
                className="input-surface w-full"
              />
            </div>
            <div>
              <label htmlFor="candidate-rating" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">
                Candidate rating
              </label>
              <input
                id="candidate-rating"
                min="1"
                max="5"
                type="range"
                value={formState.rating}
                onChange={(event) => handleFormChange("rating", event.target.value)}
                className="w-full"
              />
              <p className="mt-1 text-sm font-medium text-slate-600">Current rating: {formState.rating}/5</p>
            </div>
            {submitError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</p> : null}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              <Plus className="h-4 w-4" />
              {submitting ? "Adding candidate..." : "Add candidate"}
            </button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Kanban Pipeline View" subtitle="Visual status lanes for active candidate flow">
        <RecruitmentKanban
          candidates={filteredCandidates}
          stages={stageOptions}
          onStageChange={(id, stage) => void handleStageChange(id, stage)}
          updatingCandidateId={updatingCandidateId}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Candidate Pipeline" subtitle="Live hiring funnel with selection status controls">
          {candidatesHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading candidates...</p> : null}
          {candidatesHook.error ? <p className="text-sm font-semibold text-rose-700">{candidatesHook.error}</p> : null}
          {updateError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{updateError}</p> : null}
          <DataTable
            columns={columns}
            rows={filteredCandidates}
            rowKey={(row) => row.id}
            exportFileName="recruitment-pipeline"
            emptyText="No candidates match the current filter."
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Upcoming interviews"
            subtitle="Next 14 days of interview activity"
            rightSlot={<span className="insight-pill">{upcomingInterviews.length} scheduled</span>}
          >
            {upcomingInterviews.length > 0 ? (
              <div className="space-y-3">
                {upcomingInterviews.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{candidate.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{candidate.role} · {candidate.source}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">
                        {formatDate(candidate.interviewDate)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge value={candidate.stage} />
                      <select
                        value={candidate.stage}
                        onChange={(event) => void handleStageChange(candidate.id, event.target.value as CandidateStage)}
                        disabled={updatingCandidateId === candidate.id}
                        className="input-surface min-w-[140px] py-2"
                      >
                        {stageOptions.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage.charAt(0).toUpperCase() + stage.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">No interviews scheduled in the next two weeks.</p>
            )}
          </SectionCard>

          <SectionCard title="Hiring Notes" subtitle="Fast checkpoints for this week">
            <div className="space-y-3 text-sm font-medium text-brand-700">
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                <p className="inline-flex items-center gap-2 font-semibold text-brand-900">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Open priorities
                </p>
                <p className="mt-1">Motion Designer and UI Engineer should be filled in this sprint.</p>
              </div>
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                <p className="font-semibold text-brand-900">Interview panel cadence</p>
                <p className="mt-1">Bundle first-round interviews on Tue/Thu for faster decisions.</p>
              </div>
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                <p className="font-semibold text-brand-900">Offer conversion</p>
                <p className="mt-1">Keep role summary and compensation bands ready before final round.</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
