import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { AnnouncementStrip } from "../components/AnnouncementStrip";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import { getLoginBroadcastRemainingMs } from "../utils/loginBroadcast";
import { formatDate, formatPercent, getLocalDateKey } from "../utils/formatters";

const focusTone: Record<string, string> = {
  info: "border-sky-200/80 bg-sky-50/80",
  success: "border-emerald-200/80 bg-emerald-50/80",
  warning: "border-amber-200/80 bg-amber-50/80",
  critical: "border-rose-200/80 bg-rose-50/80",
};

const greetingBuckets: Record<"morning" | "afternoon" | "evening" | "night", string[]> = {
  morning: [
    "Good Morning! Hope you have a productive day ahead.",
    "Good Morning! Wishing you a great start.",
    "Rise and shine! Have a wonderful day.",
    "Good Morning! Let’s make today count.",
    "Good Morning! Stay focused and positive.",
    "Wishing you a bright and successful morning.",
    "Good Morning! Ready for a fresh start.",
    "Good Morning! Hope your day begins on a positive note.",
    "Welcome! Have a great morning ahead.",
    "Good Morning! Let’s achieve something great today.",
    "A fresh morning, a fresh start—good morning!",
    "Good Morning! Stay motivated and energized.",
    "Hope your morning is off to a great start!",
    "Good Morning! Wishing you a smooth day ahead.",
    "Step into the day with confidence—Good Morning!",
    "Good Morning! Make today productive and fulfilling.",
    "Sending you positive vibes this morning!",
    "Good Morning! Let’s make progress today.",
    "Hope you have a refreshing and focused morning.",
    "Good Morning! Time to shine ✨",
  ],
  afternoon: [
    "Good Afternoon! Hope your day is going well.",
    "Good Afternoon! Keep up the great work.",
    "Hope you’re having a productive afternoon.",
    "Good Afternoon! Stay energized.",
    "Wishing you a smooth and efficient afternoon.",
    "Good Afternoon! Keep pushing forward.",
    "Hope your afternoon is going great!",
    "Good Afternoon! Stay focused and positive.",
    "Keep up the momentum—Good Afternoon!",
    "Good Afternoon! You're doing great.",
    "Hope your work is progressing well this afternoon.",
    "Good Afternoon! Keep striving for excellence.",
    "Wishing you a pleasant afternoon at work.",
    "Good Afternoon! Let’s finish strong.",
    "Hope your afternoon is productive and stress-free.",
    "Good Afternoon! Stay motivated.",
    "Keep going—you're doing amazing this afternoon!",
    "Good Afternoon! Almost there for the day.",
    "Hope your afternoon brings great results.",
    "Good Afternoon! Stay sharp and focused.",
  ],
  evening: [
    "Good Evening! Hope you had a productive day.",
    "Good Evening! Time to wrap up strong.",
    "Wishing you a relaxing evening.",
    "Good Evening! Great job today.",
    "Hope you had a successful day—Good Evening!",
    "Good Evening! Take a moment to unwind.",
    "Well done today—have a pleasant evening!",
    "Good Evening! Hope everything went well today.",
    "Time to relax—Good Evening!",
    "Good Evening! Appreciate your hard work.",
    "Wishing you a calm and refreshing evening.",
    "Good Evening! You made great progress today.",
    "Hope you’re wrapping up a great day.",
    "Good Evening! Take pride in today’s work.",
    "Relax and recharge—Good Evening!",
    "Good Evening! Looking forward to tomorrow.",
    "Hope your day ended on a high note.",
    "Good Evening! Time to unwind and relax.",
    "Great effort today—have a peaceful evening.",
    "Good Evening! See you tomorrow refreshed.",
  ],
  night: [
    "Good Night! Rest well.",
    "Wishing you a peaceful night.",
    "Good Night! Recharge for tomorrow.",
    "Sleep well and take care.",
    "Good Night! See you tomorrow.",
    "Hope you have a restful night.",
    "Good Night! Time to unwind.",
    "Wishing you a calm and relaxing night.",
    "Good Night! Great work today.",
    "Sleep peacefully—Good Night!",
    "Good Night! Take a well-deserved rest.",
    "Wishing you sweet dreams.",
    "Good Night! Get ready for a fresh start tomorrow.",
    "Hope you had a great day—Good Night!",
    "Good Night! Stay relaxed and refreshed.",
    "Sleep tight and recharge well.",
    "Good Night! Looking forward to tomorrow.",
    "Rest and recover—Good Night!",
    "Wishing you a stress-free night.",
    "Good Night! End the day with positivity.",
  ],
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
};

const pickGreeting = () => {
  const bucket = getTimeOfDay();
  const options = greetingBuckets[bucket];
  const seed = new Date().getDate() + new Date().getHours();
  const index = seed % options.length;
  return options[index];
};

const cleanGreeting = (value: string) => value.replace(/[.!?]+$/u, "").trim();
const greetingTitle = () => {
  const bucket = getTimeOfDay();
  if (bucket === "morning") return "Good Morning";
  if (bucket === "afternoon") return "Good Afternoon";
  if (bucket === "evening") return "Good Evening";
  return "Good Night";
};
const stripGreetingLead = (value: string) =>
  value.replace(/^Good (Morning|Afternoon|Evening|Night)[,!\s]*/i, "").trim();

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const describeDonutSegment = (
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const performanceAspectStyles = [
  { key: "attendance", label: "Attendance streak", color: "#60a5fa" },
  { key: "workload", label: "Active workload", color: "#f97316" },
  { key: "approvals", label: "Leave approvals", color: "#a78bfa" },
  { key: "payroll", label: "Payroll visibility", color: "#34d399" },
];

export function EmployeeDashboardPage() {
  const { profile, signOut } = useAuthSession();
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const attendanceRecordsHook = useApi(useCallback(() => hrService.getMyAttendanceRecords(), []));
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));
  const commandHook = useApi(useCallback(() => hrService.getEmployeeCommandCenterData(), []));
  const announcementsHook = useApi(useCallback(() => hrService.getAnnouncements("employee"), []));
  const [showBroadcasts, setShowBroadcasts] = useState(() => getLoginBroadcastRemainingMs() > 0);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string; color: string } | null>(null);

  useEffect(() => {
    const remaining = getLoginBroadcastRemainingMs();
    if (remaining <= 0) {
      setShowBroadcasts(false);
      return;
    }

    setShowBroadcasts(true);
    const timer = window.setTimeout(() => setShowBroadcasts(false), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  const presenceRate = useMemo(() => {
    const today = new Date();
    const cutoffKey = getLocalDateKey(today);
    const monthStartKey = getLocalDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const monthRecords = (attendanceRecordsHook.data ?? []).filter(
      (record) => record.date >= monthStartKey && record.date <= cutoffKey,
    );

    const monthStats = monthRecords.reduce(
      (acc, record) => {
        if (record.status === "present") acc.present += 1;
        if (record.status === "late") acc.late += 1;
        if (record.status === "remote") acc.remote += 1;
        return acc;
      },
      { present: 0, late: 0, remote: 0 },
    );

    let weekendDays = 0;
    for (let day = 1; day <= today.getDate(); day += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const weekday = date.getDay();
      if (weekday === 0 || weekday === 6) weekendDays += 1;
    }

    const totalWorkingDays = Math.max(0, Math.min(daysInMonth, today.getDate()) - weekendDays);
    const present = monthStats.present + monthStats.late + monthStats.remote;

    if (totalWorkingDays === 0) return 0;
    return (present / totalWorkingDays) * 100;
  }, [attendanceRecordsHook.data]);

  const latestPayroll = payrollHook.data?.[0] ?? null;
  const latestProcessedPayroll = payrollHook.data?.find((record) => record.status === "processed") ?? null;
  const pendingLeaveCount = (leaveHook.data ?? []).filter((row) => row.status === "pending").length;
  const command = commandHook.data;
  const greeting = useMemo(() => cleanGreeting(pickGreeting()), []);
  const greetingHeading = useMemo(() => greetingTitle(), []);
  const greetingMessage = useMemo(() => {
    const stripped = stripGreetingLead(greeting);
    return stripped.length > 0 ? stripped : "Welcome back to your workspace.";
  }, [greeting]);

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-slate-700">Loading employee workspace...</p>;
  }

  if (isNewUserEmployeeSetupError(employeeHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Employee profile unavailable"}</p>;
  }

  const employee = employeeHook.data;
  const employeeFirstName =
    typeof employee.name === "string" && employee.name.trim().length > 0
      ? employee.name.split(" ")[0]
      : "there";
  const attendanceScore = clampScore(presenceRate);
  const totalTasks = (command?.pendingTasks ?? 0) + (command?.completedTasks ?? 0);
  const workloadScore = clampScore(totalTasks > 0 ? ((command?.pendingTasks ?? 0) / totalTasks) * 100 : 0);
  const approvalsScore = clampScore(100 - (command?.pendingApprovals ?? 0) * 20);
  const payrollScore = clampScore(latestProcessedPayroll ? 100 : latestPayroll ? 50 : 0);
  const performanceAspects = [
    { ...performanceAspectStyles[0], score: attendanceScore },
    { ...performanceAspectStyles[1], score: workloadScore },
    { ...performanceAspectStyles[2], score: approvalsScore },
    { ...performanceAspectStyles[3], score: payrollScore },
  ];
  const overallPerformance = clampScore(
    performanceAspects.reduce((sum, aspect) => sum + aspect.score, 0) / performanceAspects.length,
  );
  const gaugeBands = [
    { label: "Below par", from: 0, to: 20, color: "#f87171" },
    { label: "Bad", from: 20, to: 40, color: "#fb923c" },
    { label: "Normal", from: 40, to: 60, color: "#f472b6" },
    { label: "Good", from: 60, to: 80, color: "#60a5fa" },
    { label: "Exceptional", from: 80, to: 100, color: "#34d399" },
  ];
  const gaugeStart = 270;
  const gaugeSweep = 180;
  const gaugeCenter = 150;
  const gaugeOuter = 140;
  const gaugeInner = 106;
  const gaugeAngle = gaugeStart + (overallPerformance / 100) * gaugeSweep;
  const gaugeNeedle = polarToCartesian(gaugeCenter, gaugeCenter, gaugeInner - 6, gaugeAngle);
  const gaugeTicks = [0, 20, 40, 60, 80, 100];
  const focusItems = command?.focusItems ?? [];
  const focusByAspect = {
    attendance: focusItems.find((item) => (item.title ?? "").toLowerCase().includes("attendance")) ?? null,
    workload: focusItems.find((item) => (item.title ?? "").toLowerCase().includes("workload")) ?? null,
    approvals: focusItems.find((item) => (item.title ?? "").toLowerCase().includes("leave")) ?? null,
    payroll: focusItems.find((item) => (item.title ?? "").toLowerCase().includes("payroll")) ?? null,
  } as const;
  const resolveAspectForItem = (title?: string | null) => {
    const value = (title ?? "").toLowerCase();
    if (value.includes("attendance")) return performanceAspects[0];
    if (value.includes("workload")) return performanceAspects[1];
    if (value.includes("leave")) return performanceAspects[2];
    if (value.includes("payroll")) return performanceAspects[3];
    return null;
  };
  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title={`${greetingHeading}, ${employeeFirstName}`}
        subtitle={greetingMessage}
        eyebrow="Employee Workspace"
        action={
          <Link to="/employee/tasks" className="btn-primary px-4 py-2.5">
            Open my tasks
            <ClipboardList className="h-4 w-4" />
          </Link>
        }
      />

      {showBroadcasts ? (
        <AnnouncementStrip announcements={announcementsHook.data ?? []} loading={announcementsHook.loading} />
      ) : null}

      <section className="hero-panel relative overflow-hidden rounded-[32px] border border-white/25 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0)),radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.22),transparent_40%)]" />
        <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="relative grid items-stretch gap-8 lg:grid-cols-2">
          <div className="flex min-h-[240px] flex-col justify-center gap-4 lg:h-full">
            <div className="relative h-full w-full overflow-hidden rounded-[22px] border border-white/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(240,249,255,0.92))] p-4 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.2)] dark:border-slate-700/60 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))] dark:text-slate-100 dark:shadow-[0_28px_70px_rgba(2,6,23,0.55)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl dark:bg-sky-500/20" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-200/40 blur-2xl dark:bg-indigo-500/20" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-[0.32em] text-slate-900 dark:text-white drop-shadow-[0_6px_18px_rgba(15,23,42,0.2)]">
                    Employee performance
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{overallPerformance}%</span>
                </div>
                <div className="mt-4 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                  <div className="grid gap-3">
                    {gaugeBands.map((band) => (
                      <div
                        key={band.label}
                        className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.1)] dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(2,6,23,0.45)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-[0.72rem] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.color }} />
                            Between {band.from}-{band.to}
                          </span>
                          <span className="text-[0.7rem] font-semibold text-slate-500 dark:text-slate-300">{band.label}</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: "100%", backgroundColor: band.color, opacity: 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <svg viewBox="0 0 300 240" className="h-[240px] w-full">
                  <defs>
                    <filter id="gaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0ea5e9" floodOpacity="0.18" />
                    </filter>
                  </defs>
                  {gaugeBands.map((band) => {
                    const startAngle = gaugeStart + (band.from / 100) * gaugeSweep;
                    const endAngle = gaugeStart + (band.to / 100) * gaugeSweep;
                    return (
                      <path
                        key={band.label}
                        d={describeDonutSegment(gaugeCenter, gaugeCenter, gaugeOuter, gaugeInner, startAngle, endAngle)}
                        fill={band.color}
                        opacity={0.9}
                      />
                    );
                  })}
                  {gaugeTicks.map((tick) => {
                    const angle = gaugeStart + (tick / 100) * gaugeSweep;
                    const point = polarToCartesian(gaugeCenter, gaugeCenter, gaugeOuter + 14, angle);
                    return (
                      <text
                        key={tick}
                        x={point.x}
                        y={point.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-300"
                      >
                        {tick}
                      </text>
                    );
                  })}
                  <line
                    x1={gaugeCenter}
                    y1={gaugeCenter}
                    x2={gaugeNeedle.x}
                    y2={gaugeNeedle.y}
                    stroke="#0f172a"
                    strokeWidth="5"
                    strokeLinecap="round"
                    filter="url(#gaugeGlow)"
                  />
                  <circle cx={gaugeCenter} cy={gaugeCenter} r="8" fill="#0f172a" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-full">
            <div className="relative h-full w-full overflow-hidden rounded-[22px] border border-white/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(240,249,255,0.92))] p-4 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.2)] dark:border-slate-700/60 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))] dark:text-slate-100 dark:shadow-[0_28px_70px_rgba(2,6,23,0.55)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl dark:bg-sky-500/20" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-indigo-200/40 blur-2xl dark:bg-indigo-500/20" />
              <div className="relative">
                <div className="grid items-center gap-6 lg:grid-cols-2">
                  <div className="flex min-w-0 flex-col items-center justify-start">
                    <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-slate-900 text-center dark:text-white drop-shadow-[0_6px_18px_rgba(15,23,42,0.2)] whitespace-nowrap">
                      Breakdown performance
                    </p>
                    <div className="relative">
                      {hoveredTooltip ? (
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.15)]">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoveredTooltip.color }} />
                            {hoveredTooltip.text}
                          </span>
                        </div>
                      ) : null}
                      <svg viewBox="0 0 300 300" className="h-72 w-72 max-w-full drop-shadow-[0_34px_100px_rgba(15,23,42,0.32)]">
                      <defs>
                        <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0ea5e9" floodOpacity="0.12" />
                        </filter>
                        {performanceAspects.map((aspect) => (
                          <linearGradient
                            key={aspect.key}
                            id={`donutBase-${aspect.key}`}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor={aspect.color} stopOpacity="0.18" />
                            <stop offset="100%" stopColor={aspect.color} stopOpacity="0.35" />
                          </linearGradient>
                        ))}
                      </defs>
                        {performanceAspects.map((aspect, index) => {
                          const gap = 0;
                          const startAngle = index * 90 + gap / 2;
                          const endAngle = startAngle + 90 - gap;
                          const filledAngle = startAngle + (endAngle - startAngle) * (aspect.score / 100);
                          const outerRadius = 112;
                          const innerRadius = outerRadius - 28;
                          const focusItem =
                            aspect.key === "attendance"
                              ? focusByAspect.attendance
                              : aspect.key === "workload"
                                ? focusByAspect.workload
                                : aspect.key === "approvals"
                                  ? focusByAspect.approvals
                                  : aspect.key === "payroll"
                                    ? focusByAspect.payroll
                                    : null;
                          const tooltipValue = focusItem?.value ?? `${aspect.score}%`;
                          const tooltip = `${aspect.label}: ${tooltipValue}`;
                          return (
                            <g
                              key={aspect.key}
                              onMouseEnter={() => setHoveredTooltip({ text: tooltip, color: aspect.color })}
                              onMouseLeave={() => setHoveredTooltip(null)}
                            >
                              <path
                                d={describeDonutSegment(150, 150, outerRadius, innerRadius, startAngle, endAngle)}
                                fill={`url(#donutBase-${aspect.key})`}
                              />
                              {aspect.score > 0 ? (
                                <path
                                  d={describeDonutSegment(150, 150, outerRadius, innerRadius, startAngle, filledAngle)}
                                  fill={aspect.color}
                                  filter="url(#donutGlow)"
                                  className="transition hover:brightness-110 hover:drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                                />
                              ) : null}
                            </g>
                          );
                      })}
                    </svg>
                    </div>
                  </div>
                  <div className="min-w-0 w-full justify-self-stretch">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">&nbsp;</p>
                    <div className="mt-4 grid gap-3">
                      {performanceAspects.map((aspect) => (
                        <div
                          key={aspect.key}
                          className="w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.1)] dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(2,6,23,0.45)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-[0.72rem] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: aspect.color }} />
                              {aspect.label}
                            </span>
                            <span className="text-[0.7rem] font-semibold text-slate-500 dark:text-slate-300">{aspect.score}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${aspect.score}%`, backgroundColor: aspect.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Attendance"
          value={formatPercent(presenceRate)}
          icon={Clock3}
          accent
        />
        <StatCard title="Pending Leave" value={String(pendingLeaveCount)} icon={CalendarClock} />
        <StatCard
          title="Completed Tasks"
          value={String(command?.completedTasks ?? 0)}
          icon={ClipboardList}
        />
      </div>

      <SectionCard title="Priority Radar" subtitle="">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {(command?.focusItems ?? []).map((item) => {
            const aspect = resolveAspectForItem(item.title);
            const progress = aspect ? aspect.score : 0;
            const ringRadius = 34;
            const ringSize = 96;
            const ringCenter = ringSize / 2;
            const circumference = 2 * Math.PI * ringRadius;
            const dash = (circumference * progress) / 100;
            return (
              <Link
                key={item.id}
                to={item.route}
                className={`group relative block min-h-[220px] rounded-[32px] border p-7 transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.2)] ${focusTone[item.tone]} bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(236,248,255,0.86))] dark:border-slate-700/60 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.9),rgba(30,41,59,0.88))]`}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.95),transparent_55%)] opacity-80" />
                <div className="pointer-events-none absolute inset-x-6 top-4 h-px bg-white/70 dark:bg-white/10" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <div className="mt-3 min-h-[2.6rem]">
                          <p className="text-[1.35rem] font-semibold leading-[1.15] text-slate-950 dark:text-white">
                            {item.value}
                          </p>
                        </div>
                    </div>
                    <div className="relative h-[128px] w-[128px] shrink-0">
                      <svg viewBox={`0 0 ${ringSize} ${ringSize}`} className="h-[128px] w-[128px]">
                        <circle
                          cx={ringCenter}
                          cy={ringCenter}
                          r={ringRadius}
                          fill="none"
                          stroke="rgba(15,23,42,0.12)"
                          strokeWidth="9"
                        />
                        <circle
                          cx={ringCenter}
                          cy={ringCenter}
                          r={ringRadius}
                          fill="none"
                          stroke={aspect?.color ?? "#94a3b8"}
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
                          className="transition-all duration-300 group-hover:stroke-[12] drop-shadow-[0_8px_18px_rgba(15,23,42,0.28)]"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-bold text-slate-700 dark:text-slate-200">
                        {aspect ? `${aspect.score}%` : "--"}
                      </span>
                    </div>
                  </div>
                  <div className="relative mt-auto h-3 w-full rounded-full bg-white/80 shadow-inner dark:bg-slate-800/70">
                    <div
                      className="h-3 rounded-full transition-all duration-300 group-hover:brightness-110"
                      style={{ width: `${progress}%`, backgroundColor: aspect?.color ?? "#94a3b8" }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-6">
        <SectionCard title="Active Work" subtitle="">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Current tasks</p>
              <div className="mt-4 space-y-3">
                {(command?.activeTasks ?? []).length > 0 ? (
                  (command?.activeTasks ?? []).map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                      <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{task.description ?? "No description provided."}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-slate-500">No active tasks right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Upcoming leave</p>
              <div className="mt-4 space-y-3">
                {(command?.upcomingLeaves ?? []).length > 0 ? (
                  (command?.upcomingLeaves ?? []).map((leave) => (
                    <div key={leave.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {leave.leaveType} · {leave.days} day{leave.days === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge value={leave.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-slate-500">No upcoming leave on your calendar.</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
