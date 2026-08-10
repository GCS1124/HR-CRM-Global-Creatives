export type EmployeeStatus = "active" | "on_leave" | "inactive";
export type AttendanceStatus = "present" | "late" | "remote" | "absent";
export type AttendanceBreakKey = "bio" | "lunch" | "tea" | "meetingTraining";
export type ShiftCode = "shift_1" | "shift_2" | "shift_3";
export type ShiftApprovalStatus = "pending" | "approved";
export type LeaveStatus = "approved" | "pending" | "rejected";
export type AdminRequestType = "attendance_correction" | "leave_cancellation" | "profile_update";
export type AdminRequestStatus = "pending" | "approved" | "rejected";
export type CandidateStage = "sourced" | "interview" | "offer" | "hired" | "rejected";
export type PayrollStatus = "processed" | "scheduled";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type NotificationRole = "admin" | "employee";
export type AnnouncementAudience = NotificationRole | "all";
export type InsightTone = "info" | "success" | "warning" | "critical";

export interface DashboardOverview {
  metrics: {
    totalEmployees: number;
    activeEmployees: number;
    pendingLeaves: number;
    activeOpenings: number;
    attendanceRate: number;
    payrollTotal: number;
  };
  highlights: Array<{
    title: string;
    value: number;
  }>;
}

export interface Employee {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  joinDate: string;
  manager: string;
  status: EmployeeStatus;
  performanceScore: number;
  shiftCode?: ShiftCode | null;
  shiftApprovalStatus?: ShiftApprovalStatus;
  avgTimeOnSystemMinutes: number;
  mobile: string | null;
  address: string | null;
  pan: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
}

export type EmployeeInviteStatus = "sent" | "existing_user" | "failed";

export interface EmployeeInviteResult {
  status: EmployeeInviteStatus;
  message: string;
  userId?: string | null;
}

export interface CreateEmployeeResult {
  employee: Employee;
  invite: EmployeeInviteResult;
}

export interface UpdateEmployeePayload {
  role: string;
  department: string;
  location: string;
  manager: string;
  status: EmployeeStatus;
  performanceScore: number;
  shiftCode: ShiftCode | null;
  shiftApprovalStatus: ShiftApprovalStatus;
}

export interface EmployeeProfileDetailsPayload {
  mobile: string;
  address: string;
  pan: string;
  bankName: string;
  bankAccountNumber: string;
}

export type AttendanceBreakLegacySummary = Partial<Record<AttendanceBreakKey, number>>;

export interface AttendanceBreakSession {
  id: string;
  key: AttendanceBreakKey;
  minutes: number;
  startedAt: string | null;
  endedAt: string | null;
}

export interface AttendanceBreakSummary {
  totals: AttendanceBreakLegacySummary;
  sessions: AttendanceBreakSession[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  breakMinutes: number;
  timeOnSystemMinutes: number;
  breakSummary?: AttendanceBreakSummary | AttendanceBreakLegacySummary | null;
}

export type AttendanceCheckInMode = "office" | "remote";

export interface UpdateAttendanceRecordPayload {
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  remote: number;
  absent: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "annual" | "sick" | "casual" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  compensated: boolean;
}

export interface AttendanceCorrectionRequestPayload {
  date: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}

export type AdminRequestPayload = AttendanceCorrectionRequestPayload | Record<string, unknown>;

export interface AdminRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: AdminRequestType;
  payload: AdminRequestPayload;
  reason: string;
  status: AdminRequestStatus;
  createdAt: string;
  adminComment: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  source: string;
  stage: CandidateStage;
  interviewDate: string;
  rating: number;
  offerLetterSentAt: string | null;
  offerLetterFileName: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdByEmail: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  role: NotificationRole;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  audience: AnnouncementAudience;
  title: string;
  message: string;
  tone: InsightTone;
  graphicUrl: string | null;
  graphicAlt: string | null;
  ctaLabel: string | null;
  ctaPath: string | null;
  createdAt: string;
}

export interface NewAnnouncementPayload {
  audience: AnnouncementAudience;
  title: string;
  message: string;
  tone: InsightTone;
  graphicUrl?: string | null;
  graphicAlt?: string | null;
  ctaLabel?: string | null;
  ctaPath?: string | null;
}

export interface UpdateAnnouncementPayload extends NewAnnouncementPayload {
  id: string;
}

export interface PriorityItem {
  id: string;
  title: string;
  value: string;
  meta: string;
  route: string;
  tone: InsightTone;
}

export interface DepartmentSnapshot {
  department: string;
  headcount: number;
  activeCount: number;
  leaveCount: number;
  payrollTotal: number;
  avgPerformance: number;
}

export interface TaskSummary {
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
  overdue: number;
  critical: number;
}

export interface PayrollHealth {
  scheduledCount: number;
  processedCount: number;
  scheduledExposure: number;
  averageNetPay: number;
  highestNetPay: number;
  nextCycleLabel: string | null;
}

export interface AdminCommandCenter {
  departmentSnapshots: DepartmentSnapshot[];
  taskSummary: TaskSummary;
  payrollHealth: PayrollHealth;
  attendanceBreakdown: AttendanceSummary;
  candidatePipeline: Array<{
    stage: CandidateStage;
    count: number;
  }>;
  priorityItems: PriorityItem[];
}

export interface EmployeeCommandCenter {
  attendanceStreak: number;
  pendingTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  nextPayrollMonth: string | null;
  activeTasks: Task[];
  upcomingLeaves: LeaveRequest[];
  focusItems: PriorityItem[];
}

export interface NewTaskPayload {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export interface NewCandidatePayload {
  name: string;
  email: string;
  role: string;
  source: string;
  stage: CandidateStage;
  interviewDate: string;
  rating: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string | null;
  month: string;
  employeeName: string;
  department: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  payslipSentAt: string | null;
  payslipFileName: string | null;
}

export interface NewPayrollRecordPayload {
  employeeId: string | null;
  employeeName: string;
  department: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  status: PayrollStatus;
}

export interface PayrollSummary {
  totalNetPay: number;
  totalBonus: number;
  totalDeductions: number;
  processedCount: number;
}

export interface CRMSettings {
  companyName: string;
  timezone: string;
  payrollCycle: string;
  workingDays: string[];
  workHours: string;
  leavePolicy: {
    annual: number;
    sick: number;
    casual: number;
  };
}

export interface UpdateCRMSettingsPayload {
  companyName: string;
  timezone: string;
  payrollCycle: string;
  workingDays: string[];
  workHours: string;
  leavePolicy: {
    annual: number;
    sick: number;
    casual: number;
  };
}

export interface NewEmployeePayload {
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  joinDate: string;
  manager: string;
  status: EmployeeStatus;
  performanceScore: number;
  shiftCode: ShiftCode | null;
}

export interface DocumentDispatchResult {
  status: "sent" | "skipped" | "failed";
  message: string;
  fileName?: string | null;
}

export interface NewLeaveRequestPayload {
  leaveType: LeaveRequest["leaveType"];
  startDate: string;
  endDate: string;
  reason: string;
}
