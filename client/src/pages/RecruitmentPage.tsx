import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { 
  Calendar, 
  LayoutGrid, 
  List, 
  Plus, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Star, 
  X 
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { RecruitmentKanban } from "../components/RecruitmentKanban";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { Candidate, CandidateStage, NewCandidatePayload, NewEmployeePayload } from "../types/hr";
import { formatDate } from "../utils/formatters";
import { DEFAULT_SHIFT_CODE } from "../utils/shifts";

const stageOptions: CandidateStage[] = ["sourced", "interview", "offer", "hired", "rejected"];
const candidateCreateStageOptions: CandidateStage[] = ["sourced", "interview", "offer", "rejected"];

const initialForm: NewCandidatePayload = {
  name: "",
  email: "",
  role: "",
  source: "",
  stage: "sourced",
  interviewDate: new Date().toISOString().slice(0, 10),
  rating: 3,
};

const initialHireForm: NewEmployeePayload = {
  name: "",
  email: "",
  role: "",
  department: "Operations",
  location: "Remote",
  joinDate: new Date().toISOString().slice(0, 10),
  manager: "HR Admin",
  status: "active",
  performanceScore: 82,
  shiftCode: DEFAULT_SHIFT_CODE,
};

function suggestDepartment(role: string): string {
  const normalized = role.toLowerCase();
  if (/(designer|creative|motion|brand|visual)/.test(normalized)) return "Creative";
  if (/(seo|marketing|content|growth)/.test(normalized)) return "Marketing";
  if (/(engineer|developer|frontend|backend|software|product)/.test(normalized)) return "Technology";
  if (/(finance|payroll|account)/.test(normalized)) return "Finance";
  if (/(recruit|talent|hr|human)/.test(normalized)) return "Human Resources";
  if (/(client|success|sales|customer)/.test(normalized)) return "Client Success";
  return "Operations";
}

function suggestManager(department: string): string {
  switch (department) {
    case "Creative": return "Creative Lead";
    case "Marketing": return "Marketing Head";
    case "Technology": return "Engineering Manager";
    case "Finance": return "CFO";
    case "Human Resources": return "HR Director";
    case "Client Success": return "Operations Director";
    default: return "HR Admin";
  }
}

function buildHireDraft(candidate: Candidate): NewEmployeePayload {
  const department = suggestDepartment(candidate.role);
  return {
    ...initialHireForm,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    department,
    manager: suggestManager(department),
    joinDate: new Date().toISOString().slice(0, 10),
  };
}

export function RecruitmentPage() {
  const candidatesHook = useApi(useCallback(() => hrService.getCandidates(), []));
  const [formState, setFormState] = useState<NewCandidatePayload>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<CandidateStage | "">("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortMode, setSortMode] = useState<"interview_soon" | "interview_late" | "rating" | "name">("interview_soon");
  const [hireCandidate, setHireCandidate] = useState<Candidate | null>(null);
  const [hireFormState, setHireFormState] = useState<NewEmployeePayload>(initialHireForm);
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [showAddModal, setShowAddModal] = useState(false);

  const candidates = useMemo(() => candidatesHook.data ?? [], [candidatesHook.data]);

  const stageCount = useMemo(() => ({
    sourced: candidates.filter((item) => item.stage === "sourced").length,
    interview: candidates.filter((item) => item.stage === "interview").length,
    offer: candidates.filter((item) => item.stage === "offer").length,
    hired: candidates.filter((item) => item.stage === "hired").length,
    rejected: candidates.filter((item) => item.stage === "rejected").length,
  }), [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = candidates.filter((candidate) => {
      const matchesSearch = query ? [candidate.name, candidate.email, candidate.role, candidate.source].join(" ").toLowerCase().includes(query) : true;
      const matchesStage = stageFilter ? candidate.stage === stageFilter : true;
      const matchesSource = sourceFilter ? candidate.source === sourceFilter : true;
      return matchesSearch && matchesStage && matchesSource;
    });
    filtered.sort((left, right) => {
      if (sortMode === "rating") return right.rating - left.rating;
      if (sortMode === "name") return left.name.localeCompare(right.name);
      const lD = new Date(left.interviewDate).valueOf();
      const rD = new Date(right.interviewDate).valueOf();
      return sortMode === "interview_late" ? rD - lD : lD - rD;
    });
    return filtered;
  }, [candidates, search, sortMode, sourceFilter, stageFilter]);

  const upcomingInterviews = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 14);
    return candidates.filter((c) => c.stage !== "rejected" && c.stage !== "hired" && new Date(c.interviewDate) >= new Date(today.toDateString()) && new Date(c.interviewDate) <= end)
      .sort((l, r) => new Date(l.interviewDate).valueOf() - new Date(r.interviewDate).valueOf())
      .slice(0, 4);
  }, [candidates]);

  const sources = useMemo(() => Array.from(new Set(candidates.map((c) => c.source).filter(Boolean))).sort(), [candidates]);

  const hasActiveFilters = Boolean(search || stageFilter || sourceFilter || sortMode !== "interview_soon");

  const handleFormChange = (field: keyof NewCandidatePayload, value: string) => {
    setFormState((c) => ({ ...c, [field]: field === "rating" ? Number(value) : value }));
  };

  const handleHireFormChange = (field: keyof NewEmployeePayload, value: string) => {
    setHireFormState((c) => ({ ...c, [field]: field === "performanceScore" ? Number(value) : value }));
  };

  const handleCreateCandidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const candidate = await hrService.createCandidate(formState);
      if (candidate.stage === "offer") await hrService.dispatchCandidateOfferLetter(candidate.id);
      setFormState(initialForm);
      setActionMessage(`${candidate.name} added.`);
      setShowAddModal(false);
      await candidatesHook.refetch();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Add failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = async (candidateId: string, stage: CandidateStage) => {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    if (stage === "hired") {
      setHireCandidate(candidate);
      setHireFormState(buildHireDraft(candidate));
      return;
    }
    setUpdatingCandidateId(candidateId);
    try {
      await hrService.updateCandidateStage(candidateId, stage);
      if (stage === "offer") await hrService.dispatchCandidateOfferLetter(candidateId);
      setActionMessage(`${candidate.name} moved to ${stage}.`);
      await candidatesHook.refetch();
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setUpdatingCandidateId(null);
    }
  };

  const handleConfirmHire = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hireCandidate) return;
    setHireSubmitting(true);
    try {
      await hrService.createEmployee(hireFormState);
      await hrService.updateCandidateStage(hireCandidate.id, "hired");
      setHireCandidate(null);
      setActionMessage(`${hireCandidate.name} hired.`);
      await candidatesHook.refetch();
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Hire failed.");
    } finally {
      setHireSubmitting(false);
    }
  };

  const columns: Array<TableColumn<Candidate>> = [
    { key: "name", header: "Candidate", render: (r) => <span className="font-bold text-slate-900">{r.name}</span> },
    { key: "role", header: "Role", render: (r) => <span className="font-bold text-slate-600">{r.role}</span> },
    { key: "stage", header: "Stage", render: (r) => <StatusBadge value={r.stage} /> },
    { key: "interview", header: "Interview", render: (r) => <span className="text-xs font-bold text-slate-500">{formatDate(r.interviewDate)}</span> },
    { key: "rating", header: "Rating", render: (r) => <span className="inline-flex items-center gap-1 text-xs font-black text-brand-700 bg-brand-50 px-2 py-1 rounded-full"><Star className="h-3 w-3 fill-current" /> {r.rating}/5</span> },
    {
      key: "actions",
      header: "Action",
      render: (r) => (
        <select
          value={r.stage}
          onChange={(e) => void handleStageChange(r.id, e.target.value as CandidateStage)}
          disabled={updatingCandidateId === r.id}
          className="input-surface py-1 h-8 text-xs font-bold w-full max-w-[120px]"
          title="Change stage"
        >
          {stageOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Recruitment"
        subtitle="Manage talent pipeline and hiring flow."
        eyebrow="Talent"
        action={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode("pipeline")} className={`p-2 rounded-lg transition-all ${viewMode === 'pipeline' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'}`} title="Kanban view"><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'}`} title="Table view"><List className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Add Candidate
            </button>
          </div>
        }
      />

      {actionMessage && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">{actionMessage}</p>}
      {updateError && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">{updateError}</p>}

      <div className="sticky top-[72px] z-10 -mx-4 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidates..." className="input-surface w-full pl-10 h-10" />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as CandidateStage | "")} className="input-surface h-10 text-xs font-bold" title="Filter by Stage">
          <option value="">All Stages</option>
          {stageOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="input-surface h-10 text-xs font-bold" title="Filter by Source">
          <option value="">All Sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasActiveFilters && <button onClick={() => { setSearch(""); setStageFilter(""); setSourceFilter(""); setSortMode("interview_soon"); }} className="btn-secondary h-10 px-3" title="Reset Filters"><RotateCcw className="h-4 w-4" /></button>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {viewMode === "pipeline" ? (
             <RecruitmentKanban
               candidates={filteredCandidates}
               stages={stageOptions}
               onStageChange={(id, s) => void handleStageChange(id, s)}
               updatingCandidateId={updatingCandidateId}
             />
          ) : (
            <SectionCard title="Candidate List">
              <DataTable columns={columns} rows={filteredCandidates} rowKey={(r) => r.id} exportFileName="recruitment" />
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          <SectionCard
            title="Interviews"
            subtitle="Upcoming next 14 days"
            rightSlot={<Calendar className="h-4 w-4 text-slate-300" />}
            collapsible
            defaultCollapsed
          >
            <div className="space-y-3">
              {upcomingInterviews.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all cursor-default">
                  <p className="text-xs font-black text-slate-900 truncate">{c.name}</p>
                  <p className="mt-0.5 text-[0.65rem] font-bold text-slate-500 truncate">{c.role}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[0.6rem] font-black uppercase text-brand-600">{formatDate(c.interviewDate)}</span>
                    <StatusBadge value={c.stage} />
                  </div>
                </div>
              ))}
              {upcomingInterviews.length === 0 && <p className="text-center py-4 text-xs font-bold text-slate-400">No scheduled events.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Funnel Velocity" collapsible defaultCollapsed>
             <div className="space-y-3">
                {stageOptions.map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-black uppercase text-slate-500">{s}</span>
                    <span className="text-sm font-black text-slate-900">{stageCount[s as keyof typeof stageCount]}</span>
                  </div>
                ))}
             </div>
          </SectionCard>
        </aside>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-page-enter">
          <div className="w-full max-w-xl bg-white rounded-[32px] shadow-panel overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Add New Candidate</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Capture details to begin the recruitment flow.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-slate-200" title="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCandidate} className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input required value={formState.name} onChange={(e) => handleFormChange("name", e.target.value)} placeholder="Candidate Name" className="input-surface w-full" />
                <input required type="email" value={formState.email} onChange={(e) => handleFormChange("email", e.target.value)} placeholder="Email Address" className="input-surface w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required value={formState.role} onChange={(e) => handleFormChange("role", e.target.value)} placeholder="Job Role" className="input-surface w-full" />
                <input required value={formState.source} onChange={(e) => handleFormChange("source", e.target.value)} placeholder="Source (e.g. LinkedIn)" className="input-surface w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select value={formState.stage} onChange={(e) => handleFormChange("stage", e.target.value)} className="input-surface w-full" title="Stage">
                  {candidateCreateStageOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input required type="date" value={formState.interviewDate} onChange={(e) => handleFormChange("interviewDate", e.target.value)} className="input-surface w-full" title="Interview Date" />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <label className="text-[0.6rem] font-black uppercase text-slate-400">Rating</label>
                    <span className="text-xs font-black text-brand-700">{formState.rating}/5</span>
                 </div>
                 <input type="range" min="1" max="5" value={formState.rating} onChange={(e) => handleFormChange("rating", e.target.value)} className="w-full accent-brand-600" title="Candidate Rating" />
              </div>
              {submitError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">{submitError}</p>}
              <button type="submit" disabled={submitting} className="btn-primary w-full h-11">
                <Plus className="h-4 w-4" />
                {submitting ? "Adding..." : "Confirm Candidate"}
              </button>
            </form>
          </div>
        </div>
      )}

      {hireCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-page-enter">
          <div className="w-full max-w-2xl bg-white rounded-[32px] shadow-panel overflow-hidden border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h2 className="text-xl font-black text-emerald-900 tracking-tight">Confirm Hire</h2>
                <p className="text-xs font-bold text-emerald-700 mt-1">Convert {hireCandidate.name} into an employee record.</p>
              </div>
              <button onClick={() => setHireCandidate(null)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-emerald-200" title="Close">
                <X className="h-5 w-5 text-emerald-400" />
              </button>
            </div>
            <form onSubmit={handleConfirmHire} className="p-6 space-y-4">
               <div className="grid gap-4 sm:grid-cols-2">
                  <input required value={hireFormState.name} onChange={(e) => handleHireFormChange("name", e.target.value)} placeholder="Full Name" className="input-surface w-full" />
                  <input required type="email" value={hireFormState.email} onChange={(e) => handleHireFormChange("email", e.target.value)} placeholder="Email" className="input-surface w-full" />
               </div>
               <div className="grid gap-4 sm:grid-cols-2">
                  <input required value={hireFormState.role} onChange={(e) => handleHireFormChange("role", e.target.value)} placeholder="Role" className="input-surface w-full" />
                  <input required value={hireFormState.department} onChange={(e) => handleHireFormChange("department", e.target.value)} placeholder="Department" className="input-surface w-full" />
               </div>
               <div className="grid gap-4 sm:grid-cols-2">
                  <input required value={hireFormState.manager} onChange={(e) => handleHireFormChange("manager", e.target.value)} placeholder="Manager" className="input-surface w-full" />
                  <input required type="date" value={hireFormState.joinDate} onChange={(e) => handleHireFormChange("joinDate", e.target.value)} className="input-surface w-full" title="Join Date" />
               </div>
               <div className="p-3 rounded-xl bg-brand-50 border border-brand-100 flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-[0.7rem] font-bold text-brand-800 leading-relaxed">
                    This candidate will be added to <span className="font-black">{hireFormState.department}</span> reporting to <span className="font-black">{hireFormState.manager}</span>. A login invite will be sent immediately.
                  </p>
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={() => setHireCandidate(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={hireSubmitting} className="btn-primary flex-[2] h-11 bg-emerald-600 border-emerald-700">
                    {hireSubmitting ? "Syncing..." : "Finalize Hire"}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
