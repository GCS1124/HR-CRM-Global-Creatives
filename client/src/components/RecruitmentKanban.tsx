import { useMemo, useState } from "react";
import { GripVertical, Star } from "lucide-react";
import type { Candidate, CandidateStage } from "../types/hr";
import { StatusBadge } from "./StatusBadge";

interface RecruitmentKanbanProps {
  candidates: Candidate[];
  stages: CandidateStage[];
  onStageChange: (candidateId: string, stage: CandidateStage) => void;
  updatingCandidateId?: string | null;
}

export function RecruitmentKanban({ candidates, stages, onStageChange, updatingCandidateId }: RecruitmentKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const base = new Map<CandidateStage, Candidate[]>();
    stages.forEach((stage) => base.set(stage, []));
    candidates.forEach((candidate) => {
      base.get(candidate.stage)?.push(candidate);
    });
    stages.forEach((stage) => {
      const list = base.get(stage);
      if (list) {
        list.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
      }
    });
    return base;
  }, [candidates, stages]);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {stages.map((stage) => {
        const list = grouped.get(stage) ?? [];
        const isDroppable = draggingId !== null;

        return (
          <div
            key={stage}
            className={`rounded-2xl border border-brand-200 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/80 ${
              isDroppable ? "ring-1 ring-brand-200 dark:ring-brand-400/20" : ""
            }`}
            onDragOver={(event) => {
              if (isDroppable) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (!draggingId) {
                return;
              }
              const candidate = candidates.find((item) => item.id === draggingId);
              if (candidate && candidate.stage !== stage) {
                onStageChange(candidate.id, stage);
              }
              setDraggingId(null);
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
              <StatusBadge value={stage} />
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">{list.length} candidates</p>
              </div>
            </div>

            <div className="space-y-3">
              {list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">
                  Drop candidates here.
                </div>
              ) : null}
              {list.map((candidate) => {
                const isUpdating = updatingCandidateId === candidate.id;
                const isDragging = draggingId === candidate.id;

                return (
                  <div
                    key={candidate.id}
                    draggable={!isUpdating}
                  onDragStart={() => setDraggingId(candidate.id)}
                  onDragEnd={() => setDraggingId(null)}
                    className={`rounded-xl border border-brand-200 bg-white p-3 shadow-sm transition dark:border-slate-700/60 dark:bg-slate-900/80 ${
                      isDragging ? "opacity-70" : ""
                    } ${isUpdating ? "opacity-60" : "hover:-translate-y-0.5"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-brand-950 dark:text-slate-50">{candidate.name}</p>
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-200">{candidate.role}</p>
                      </div>
                      <GripVertical className="h-4 w-4 text-brand-400 dark:text-slate-500" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-200">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 dark:bg-brand-500/10">
                        <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                        {candidate.rating}/5
                      </span>
                      {isUpdating ? <span className="text-amber-600">Updating...</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
