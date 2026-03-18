export type EmployeeStatus = "active" | "on_leave" | "inactive";
export type AttendanceStatus = "present" | "late" | "remote" | "absent";
export type LeaveStatus = "approved" | "pending" | "rejected";
export type CandidateStage = "sourced" | "interview" | "offer" | "hired" | "rejected";
export type PayrollStatus = "processed" | "scheduled";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

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
}

export interface UpdateEmployeePayload {
  role: string;
  department: string;
  location: string;
  manager: string;
  status: EmployeeStatus;
  performanceScore: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
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
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  source: string;
  stage: CandidateStage;
  interviewDate: string;
  rating: number;
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
}

export interface NewLeaveRequestPayload {
  leaveType: LeaveRequest["leaveType"];
  startDate: string;
  endDate: string;
  reason: string;
}
