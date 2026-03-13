import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { BriefcaseBusiness, CircleDot, Plus, Star } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
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
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          {[
            { key: "sourced", label: "Sourced", tone: "border-indigo-200 bg-indigo-50/70" },
            { key: "interview", label: "Interview", tone: "border-sky-200 bg-sky-50/70" },
            { key: "offer", label: "Offer", tone: "border-violet-200 bg-violet-50/70" },
            { key: "hired", label: "Hired", tone: "border-emerald-200 bg-emerald-50/70" },
            { key: "rejected", label: "Rejected", tone: "border-rose-200 bg-rose-50/70" },
          ].map((lane) => {
            const laneRows = (candidatesHook.data ?? []).filter((candidate) => candidate.stage === lane.key);

            return (
              <div key={lane.key} className={`rounded-xl border p-3 ${lane.tone}`}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">{lane.label}</p>
                <div className="mt-2 space-y-2">
                  {laneRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-brand-200 bg-white/70 px-3 py-2 text-xs font-semibold text-brand-700">
                      No candidates
                    </p>
                  ) : (
                    laneRows.map((candidate) => (
                      <div key={candidate.id} className="rounded-lg border border-brand-200 bg-white px-3 py-3">
                        <p className="text-sm font-bold text-brand-900">{candidate.name}</p>
                        <p className="text-xs text-brand-700">{candidate.role}</p>
                        <select
                          value={candidate.stage}
                          onChange={(event) => void handleStageChange(candidate.id, event.target.value as CandidateStage)}
                          disabled={updatingCandidateId === candidate.id}
                          className="input-surface mt-3 w-full py-2"
                        >
                          {stageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Candidate Pipeline" subtitle="Live hiring funnel with selection status controls">
          {candidatesHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading candidates...</p> : null}
          {candidatesHook.error ? <p className="text-sm font-semibold text-rose-700">{candidatesHook.error}</p> : null}
          {updateError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{updateError}</p> : null}
          <DataTable
            columns={columns}
            rows={candidatesHook.data ?? []}
            rowKey={(row) => row.id}
            emptyText="No candidates in pipeline."
          />
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
  );
}
