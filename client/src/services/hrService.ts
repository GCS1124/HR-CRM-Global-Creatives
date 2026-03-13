import type {
  AttendanceCheckInMode,
  AttendanceRecord,
  AttendanceSummary,
  Candidate,
  CRMSettings,
  DashboardOverview,
  Employee,
  LeaveRequest,
  NewCandidatePayload,
  NewEmployeePayload,
  NewLeaveRequestPayload,
  NewPayrollRecordPayload,
  PayrollRecord,
  PayrollSummary,
  UpdateAttendanceRecordPayload,
  UpdateCRMSettingsPayload,
  UpdateEmployeePayload,
} from "../types/hr";
import { supabase } from "./supabaseClient";
import { getLocalDateKey, getLocalTimeLabel } from "../utils/formatters";

interface EmployeeQuery {
  search?: string;
  department?: string;
  status?: string;
}

interface EmployeeRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  join_date: string;
  manager: string;
  status: Employee["status"];
  performance_score: number;
}

interface AttendanceRow {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: AttendanceRecord["status"];
}

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: LeaveRequest["leaveType"];
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveRequest["status"];
}

interface CandidateRow {
  id: string;
  name: string;
  role: string;
  source: string;
  stage: Candidate["stage"];
  interview_date: string;
  rating: number;
}

interface PayrollRow {
  id: string;
  employee_id: string | null;
  month: string;
  employee_name: string;
  department: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_pay: number;
  status: PayrollRecord["status"];
}

interface SettingsRow {
  id: number;
  company_name: string;
  timezone: string;
  payroll_cycle: string;
  working_days: string[];
  work_hours: string;
  leave_policy: CRMSettings["leavePolicy"];
}

let employeesUserIdState: "unknown" | "missing" | "available" = "unknown";
let currentEmployeeCache: { userId: string; employee: Employee } | null = null;
let currentEmployeePromise: Promise<Employee> | null = null;
let currentEmployeePromiseUserId: string | null = null;

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    location: row.location,
    joinDate: row.join_date,
    manager: row.manager,
    status: row.status,
    performanceScore: row.performance_score,
  };
}

function toAttendanceRecord(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
  };
}

function toLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    reason: row.reason,
    status: row.status,
  };
}

function toCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    source: row.source,
    stage: row.stage,
    interviewDate: row.interview_date,
    rating: row.rating,
  };
}

function toPayrollRecord(row: PayrollRow): PayrollRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    employeeName: row.employee_name,
    department: row.department,
    baseSalary: row.base_salary,
    bonus: row.bonus,
    deductions: row.deductions,
    netPay: row.net_pay,
    status: row.status,
  };
}

function toSettings(row: SettingsRow): CRMSettings {
  return {
    companyName: row.company_name,
    timezone: row.timezone,
    payrollCycle: row.payroll_cycle,
    workingDays: row.working_days,
    workHours: row.work_hours,
    leavePolicy: row.leave_policy,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[%_,]/g, (match) => `\\${match}`);
}

function throwIfError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`Supabase ${context} failed: ${error.message}`);
  }
}

function createId(prefix: string): string {
  const time = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${time}${random}`;
}

function countLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return 1;
  }

  const diff = Math.abs(end.valueOf() - start.valueOf());
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)) + 1, 1);
}

function resolveAttendanceStatus(mode: AttendanceCheckInMode, stamp: Date): AttendanceRecord["status"] {
  if (mode === "remote") {
    return "remote";
  }

  const totalMinutes = stamp.getHours() * 60 + stamp.getMinutes();
  return totalMinutes > 9 * 60 + 15 ? "late" : "present";
}

function hasMissingUserIdColumn(error: { message: string } | null): boolean {
  return Boolean(error?.message.toLowerCase().includes("user_id"));
}

async function linkEmployeeToUser(employeeId: string, userId: string): Promise<void> {
  if (employeesUserIdState === "missing") {
    return;
  }

  const client = assertSupabase();
  const { error } = await client.from("employees").update({ user_id: userId }).eq("id", employeeId);

  if (hasMissingUserIdColumn(error)) {
    employeesUserIdState = "missing";
    return;
  }

  if (!error) {
    employeesUserIdState = "available";
    return;
  }

  if (error && !hasMissingUserIdColumn(error)) {
    throwIfError(error, "employee link update");
  }
}

async function createEmployeeRecordForUser(user: CurrentUserAuth): Promise<Employee | null> {
  const client = assertSupabase();

  if (!user.email) {
    return null;
  }

  const baseRow = {
    id: createId("EMP"),
    name: resolveEmployeeName(user),
    email: user.email,
    role: "Employee",
    department: "General Operations",
    location: "Remote",
    join_date: new Date().toISOString().slice(0, 10),
    manager: "HR Admin",
    status: "active" as const,
    performance_score: 80,
  };

  if (employeesUserIdState !== "missing") {
    const insertWithLink = await client
      .from("employees")
      .insert({ ...baseRow, user_id: user.id })
      .select("*")
      .single();

    if (!insertWithLink.error && insertWithLink.data) {
      employeesUserIdState = "available";
      return toEmployee(insertWithLink.data as EmployeeRow);
    }

    if (hasMissingUserIdColumn(insertWithLink.error)) {
      employeesUserIdState = "missing";
    } else {
      const duplicateEmail = insertWithLink.error?.message.toLowerCase().includes("duplicate");
      const duplicateKey = insertWithLink.error?.message.toLowerCase().includes("unique");
      const permissionDenied = insertWithLink.error?.message.toLowerCase().includes("permission");

      if (!duplicateEmail && !duplicateKey && !permissionDenied) {
        throwIfError(insertWithLink.error, "employee auto-provision");
      }
    }
  }

  const insertWithoutLink = await client.from("employees").insert(baseRow).select("*").single();

  if (!insertWithoutLink.error && insertWithoutLink.data) {
    return toEmployee(insertWithoutLink.data as EmployeeRow);
  }

  const duplicateEmail =
    insertWithoutLink.error?.message.toLowerCase().includes("duplicate") ||
    insertWithoutLink.error?.message.toLowerCase().includes("unique");

  const permissionDenied = insertWithoutLink.error?.message.toLowerCase().includes("permission");

  if (!duplicateEmail && !permissionDenied) {
    throwIfError(insertWithoutLink.error, "employee auto-provision fallback");
  }

  const existing = await client.from("employees").select("*").eq("email", user.email).maybeSingle();
  throwIfError(existing.error, "employee auto-provision duplicate recovery");

  if (existing.data) {
    return toEmployee(existing.data as EmployeeRow);
  }

  return null;
}

interface CurrentUserAuth {
  id: string;
  email: string | null;
  fullName: string | null;
}

function formatNameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveEmployeeName(user: CurrentUserAuth): string {
  if (user.fullName?.trim()) {
    return user.fullName.trim();
  }

  if (user.email) {
    return formatNameFromEmail(user.email);
  }

  return "Employee User";
}

function buildFallbackEmployee(user: CurrentUserAuth, employeeId?: string): Employee {
  return {
    id: employeeId ?? `SELF-${user.id.slice(0, 8).toUpperCase()}`,
    userId: user.id,
    name: resolveEmployeeName(user),
    email: user.email ?? "",
    role: "Employee",
    department: "General Operations",
    location: "Remote",
    joinDate: new Date().toISOString().slice(0, 10),
    manager: "HR Admin",
    status: "active",
    performanceScore: 80,
  };
}

async function getCurrentUserAuth(): Promise<CurrentUserAuth> {
  const client = assertSupabase();
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("User session expired. Please sign in again.");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    fullName:
      typeof data.user.user_metadata.full_name === "string" ? data.user.user_metadata.full_name : null,
  };
}

export const hrService = {
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const client = assertSupabase();

    const [employeesResult, leaveResult, candidatesResult, attendanceResult, payrollResult] = await Promise.all([
      client.from("employees").select("id, status"),
      client.from("leave_requests").select("id, status"),
      client.from("candidates").select("id, stage"),
      client.from("attendance_records").select("id, status"),
      client.from("payroll_records").select("id, net_pay"),
    ]);

    throwIfError(employeesResult.error, "employees fetch");
    throwIfError(leaveResult.error, "leave requests fetch");
    throwIfError(candidatesResult.error, "candidates fetch");
    throwIfError(attendanceResult.error, "attendance fetch");
    throwIfError(payrollResult.error, "payroll fetch");

    const employees = employeesResult.data ?? [];
    const leaves = leaveResult.data ?? [];
    const candidates = candidatesResult.data ?? [];
    const attendance = attendanceResult.data ?? [];
    const payroll = payrollResult.data ?? [];

    const presentCount = attendance.filter(
      (record) => record.status === "present" || record.status === "remote",
    ).length;
    const payrollTotal = payroll.reduce((sum, row) => sum + Number(row.net_pay ?? 0), 0);

    return {
      metrics: {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((employee) => employee.status === "active").length,
        pendingLeaves: leaves.filter((leave) => leave.status === "pending").length,
        activeOpenings: candidates.filter((candidate) => candidate.stage !== "rejected").length,
        attendanceRate: Number(((presentCount / Math.max(employees.length, 1)) * 100).toFixed(1)),
        payrollTotal,
      },
      highlights: [
        { title: "New hires this month", value: 3 },
        { title: "Interviews scheduled", value: 7 },
        { title: "Performance reviews due", value: 5 },
      ],
    };
  },

  getEmployees: async (query: EmployeeQuery = {}): Promise<Employee[]> => {
    const client = assertSupabase();
    let builder = client.from("employees").select("*");

    if (query.search) {
      const value = escapeLike(query.search.trim());
      builder = builder.or(`name.ilike.%${value}%,email.ilike.%${value}%,role.ilike.%${value}%`);
    }

    if (query.department) {
      builder = builder.eq("department", query.department);
    }

    if (query.status) {
      builder = builder.eq("status", query.status);
    }

    const { data, error } = await builder.order("join_date", { ascending: false });
    throwIfError(error, "employees fetch");

    return (data ?? []).map((row) => toEmployee(row as EmployeeRow));
  },

  createEmployee: async (payload: NewEmployeePayload): Promise<Employee> => {
    const client = assertSupabase();
    const row: EmployeeRow = {
      id: createId("EMP"),
      user_id: null,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      department: payload.department,
      location: payload.location,
      join_date: payload.joinDate,
      manager: payload.manager,
      status: payload.status,
      performance_score: payload.performanceScore,
    };

    const { data, error } = await client.from("employees").insert(row).select("*").single();
    throwIfError(error, "employee create");

    return toEmployee(data as EmployeeRow);
  },

  updateEmployee: async (id: string, payload: UpdateEmployeePayload): Promise<Employee> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("employees")
      .update({
        role: payload.role,
        department: payload.department,
        location: payload.location,
        manager: payload.manager,
        status: payload.status,
        performance_score: payload.performanceScore,
      })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "employee update");
    return toEmployee(data as EmployeeRow);
  },

  archiveEmployee: async (id: string): Promise<Employee> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("employees")
      .update({ status: "inactive" })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "employee archive");
    return toEmployee(data as EmployeeRow);
  },

  deleteEmployee: async (id: string): Promise<void> => {
    const client = assertSupabase();
    const { error } = await client.from("employees").delete().eq("id", id);
    throwIfError(error, "employee delete");
  },

  getAttendanceSummary: async (): Promise<AttendanceSummary> => {
    const client = assertSupabase();
    const { data, error } = await client.from("attendance_records").select("status");
    throwIfError(error, "attendance summary fetch");

    return (data ?? []).reduce(
      (acc, record) => {
        const status = record.status as AttendanceRecord["status"];
        acc[status] += 1;
        return acc;
      },
      { present: 0, late: 0, remote: 0, absent: 0 },
    );
  },

  getAttendanceRecords: async (): Promise<AttendanceRecord[]> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false });

    throwIfError(error, "attendance records fetch");
    return (data ?? []).map((row) => toAttendanceRecord(row as AttendanceRow));
  },

  updateAttendanceRecord: async (id: string, payload: UpdateAttendanceRecordPayload): Promise<AttendanceRecord> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("attendance_records")
      .update({
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        status: payload.status,
      })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "attendance record update");
    return toAttendanceRecord(data as AttendanceRow);
  },

  bulkUpdateAttendanceStatus: async (ids: string[], status: AttendanceRecord["status"]): Promise<AttendanceRecord[]> => {
    if (ids.length === 0) {
      return [];
    }

    const client = assertSupabase();
    const { data, error } = await client
      .from("attendance_records")
      .update({ status })
      .in("id", ids)
      .select("*");

    throwIfError(error, "attendance bulk status update");
    return (data ?? []).map((row) => toAttendanceRecord(row as AttendanceRow));
  },

  getLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const client = assertSupabase();
    const { data, error } = await client.from("leave_requests").select("*").order("start_date", { ascending: true });

    throwIfError(error, "leave requests fetch");
    return (data ?? []).map((row) => toLeaveRequest(row as LeaveRequestRow));
  },

  updateLeaveStatus: async (id: string, status: LeaveRequest["status"]): Promise<LeaveRequest> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("leave_requests")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "leave status update");
    return toLeaveRequest(data as LeaveRequestRow);
  },

  getCandidates: async (): Promise<Candidate[]> => {
    const client = assertSupabase();
    const { data, error } = await client.from("candidates").select("*").order("interview_date", { ascending: true });

    throwIfError(error, "candidates fetch");
    return (data ?? []).map((row) => toCandidate(row as CandidateRow));
  },

  createCandidate: async (payload: NewCandidatePayload): Promise<Candidate> => {
    const client = assertSupabase();
    const row: CandidateRow = {
      id: createId("CAN"),
      name: payload.name,
      role: payload.role,
      source: payload.source,
      stage: payload.stage,
      interview_date: payload.interviewDate,
      rating: payload.rating,
    };

    const { data, error } = await client.from("candidates").insert(row).select("*").single();
    throwIfError(error, "candidate create");

    return toCandidate(data as CandidateRow);
  },

  updateCandidateStage: async (id: string, stage: Candidate["stage"]): Promise<Candidate> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("candidates")
      .update({ stage })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "candidate stage update");
    return toCandidate(data as CandidateRow);
  },

  getPayrollRecords: async (): Promise<PayrollRecord[]> => {
    const client = assertSupabase();
    const { data, error } = await client.from("payroll_records").select("*").order("month", { ascending: false });

    throwIfError(error, "payroll records fetch");
    return (data ?? []).map((row) => toPayrollRecord(row as PayrollRow));
  },

  createPayrollRecord: async (payload: NewPayrollRecordPayload): Promise<PayrollRecord> => {
    const client = assertSupabase();
    const row: PayrollRow = {
      id: createId("PAY"),
      employee_id: payload.employeeId,
      month: payload.month,
      employee_name: payload.employeeName,
      department: payload.department,
      base_salary: payload.baseSalary,
      bonus: payload.bonus,
      deductions: payload.deductions,
      net_pay: Math.max(payload.baseSalary + payload.bonus - payload.deductions, 0),
      status: payload.status,
    };

    const { data, error } = await client.from("payroll_records").insert(row).select("*").single();
    throwIfError(error, "payroll record create");

    return toPayrollRecord(data as PayrollRow);
  },

  updatePayrollStatus: async (id: string, status: PayrollRecord["status"]): Promise<PayrollRecord> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("payroll_records")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "payroll status update");
    return toPayrollRecord(data as PayrollRow);
  },

  bulkUpdatePayrollStatus: async (ids: string[], status: PayrollRecord["status"]): Promise<PayrollRecord[]> => {
    if (ids.length === 0) {
      return [];
    }

    const client = assertSupabase();
    const { data, error } = await client
      .from("payroll_records")
      .update({ status })
      .in("id", ids)
      .select("*");

    throwIfError(error, "payroll bulk status update");
    return (data ?? []).map((row) => toPayrollRecord(row as PayrollRow));
  },

  deletePayrollRecord: async (id: string): Promise<void> => {
    const client = assertSupabase();
    const { error } = await client.from("payroll_records").delete().eq("id", id);
    throwIfError(error, "payroll delete");
  },

  bulkDeletePayrollRecords: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) {
      return;
    }

    const client = assertSupabase();
    const { error } = await client.from("payroll_records").delete().in("id", ids);
    throwIfError(error, "payroll bulk delete");
  },

  getPayrollSummary: async (): Promise<PayrollSummary> => {
    const client = assertSupabase();
    const { data, error } = await client.from("payroll_records").select("net_pay, bonus, deductions, status");
    throwIfError(error, "payroll summary fetch");

    const rows = data ?? [];

    return {
      totalNetPay: rows.reduce((sum, row) => sum + Number(row.net_pay ?? 0), 0),
      totalBonus: rows.reduce((sum, row) => sum + Number(row.bonus ?? 0), 0),
      totalDeductions: rows.reduce((sum, row) => sum + Number(row.deductions ?? 0), 0),
      processedCount: rows.filter((row) => row.status === "processed").length,
    };
  },

  getSettings: async (): Promise<CRMSettings> => {
    const client = assertSupabase();
    const { data, error } = await client.from("crm_settings").select("*").limit(1).maybeSingle();
    throwIfError(error, "settings fetch");

    if (!data) {
      throw new Error("Supabase settings are missing. Seed the crm_settings table.");
    }

    return toSettings(data as SettingsRow);
  },

  updateSettings: async (payload: UpdateCRMSettingsPayload): Promise<CRMSettings> => {
    const client = assertSupabase();
    const { data: currentRow, error: currentError } = await client
      .from("crm_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    throwIfError(currentError, "settings fetch for update");

    if (!currentRow) {
      throw new Error("Supabase settings are missing. Seed the crm_settings table.");
    }

    const { data, error } = await client
      .from("crm_settings")
      .update({
        company_name: payload.companyName,
        timezone: payload.timezone,
        payroll_cycle: payload.payrollCycle,
        working_days: payload.workingDays,
        work_hours: payload.workHours,
        leave_policy: payload.leavePolicy,
      })
      .eq("id", currentRow.id)
      .select("*")
      .single();

    throwIfError(error, "settings update");
    return toSettings(data as SettingsRow);
  },

  getCurrentEmployee: async (): Promise<Employee> => {
    const user = await getCurrentUserAuth();

    if (currentEmployeeCache?.userId === user.id) {
      return currentEmployeeCache.employee;
    }

    if (currentEmployeePromise && currentEmployeePromiseUserId === user.id) {
      return currentEmployeePromise;
    }

    currentEmployeePromiseUserId = user.id;
    currentEmployeePromise = (async () => {
      const client = assertSupabase();

      if (employeesUserIdState !== "missing") {
        const { data, error } = await client
          .from("employees")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (hasMissingUserIdColumn(error)) {
          employeesUserIdState = "missing";
        } else if (error) {
          throwIfError(error, "employee profile fetch");
        } else {
          employeesUserIdState = "available";
        }

        if (data) {
          return toEmployee(data as EmployeeRow);
        }
      }

      if (user.email) {
        const fallback = await client.from("employees").select("*").eq("email", user.email).maybeSingle();
        throwIfError(fallback.error, "employee profile fallback fetch");

        if (fallback.data) {
          const employee = toEmployee(fallback.data as EmployeeRow);

          if (!employee.userId) {
            try {
              await linkEmployeeToUser(employee.id, user.id);
              return { ...employee, userId: user.id };
            } catch {
              return employee;
            }
          }

          return employee;
        }
      }

      const provisionedEmployee = await createEmployeeRecordForUser(user);

      if (provisionedEmployee) {
        return provisionedEmployee;
      }

      return buildFallbackEmployee(user);
    })();

    try {
      const employee = await currentEmployeePromise;
      currentEmployeeCache = { userId: user.id, employee };
      return employee;
    } finally {
      currentEmployeePromise = null;
      currentEmployeePromiseUserId = null;
    }
  },

  getMyAttendanceRecords: async (): Promise<AttendanceRecord[]> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { data, error } = await client
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false });

    throwIfError(error, "my attendance fetch");
    return (data ?? [])
      .map((row) => toAttendanceRecord(row as AttendanceRow))
      .filter((row) => row.employeeId === employee.id || row.employeeName === employee.name);
  },

  getMyTodayAttendance: async (): Promise<AttendanceRecord | null> => {
    const records = await hrService.getMyAttendanceRecords();
    const today = getLocalDateKey();

    return records.find((record) => record.date === today) ?? null;
  },

  getMyAttendanceSummary: async (): Promise<AttendanceSummary> => {
    const records = await hrService.getMyAttendanceRecords();
    return records.reduce(
      (acc, record) => {
        acc[record.status] += 1;
        return acc;
      },
      { present: 0, late: 0, remote: 0, absent: 0 },
    );
  },

  getMyLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { data, error } = await client.from("leave_requests").select("*").order("start_date", { ascending: false });

    throwIfError(error, "my leave fetch");
    return (data ?? [])
      .map((row) => toLeaveRequest(row as LeaveRequestRow))
      .filter((row) => row.employeeId === employee.id || row.employeeName === employee.name);
  },

  createMyLeaveRequest: async (payload: NewLeaveRequestPayload): Promise<LeaveRequest> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();

    const row: LeaveRequestRow = {
      id: createId("LEV"),
      employee_id: employee.id,
      employee_name: employee.name,
      leave_type: payload.leaveType,
      start_date: payload.startDate,
      end_date: payload.endDate,
      days: countLeaveDays(payload.startDate, payload.endDate),
      reason: payload.reason,
      status: "pending",
    };

    const { data, error } = await client.from("leave_requests").insert(row).select("*").single();
    throwIfError(error, "leave request create");

    return toLeaveRequest(data as LeaveRequestRow);
  },

  getMyPayrollRecords: async (): Promise<PayrollRecord[]> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { data, error } = await client
      .from("payroll_records")
      .select("*")
      .order("month", { ascending: false });

    throwIfError(error, "my payroll fetch");
    return (data ?? [])
      .map((row) => toPayrollRecord(row as PayrollRow))
      .filter((row) => row.employeeId === employee.id || row.employeeName === employee.name);
  },

  markMyAttendance: async (mode: AttendanceCheckInMode): Promise<AttendanceRecord> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const now = new Date();
    const today = getLocalDateKey(now);
    const currentTime = getLocalTimeLabel(now);
    const todayRecord = await hrService.getMyTodayAttendance();

    if (todayRecord) {
      if (todayRecord.checkOut !== "--") {
        return todayRecord;
      }

      const nextStatus = resolveAttendanceStatus(mode, now);
      const { data, error } = await client
        .from("attendance_records")
        .update({
          status: nextStatus,
          check_in: todayRecord.checkIn === "--" ? currentTime : todayRecord.checkIn,
        })
        .eq("id", todayRecord.id)
        .select("*")
        .single();

      throwIfError(error, "attendance check-in update");
      return toAttendanceRecord(data as AttendanceRow);
    }

    const row: AttendanceRow = {
      id: createId("ATT"),
      employee_id: employee.id,
      employee_name: employee.name,
      date: today,
      check_in: currentTime,
      check_out: "--",
      status: resolveAttendanceStatus(mode, now),
    };

    const { data, error } = await client.from("attendance_records").insert(row).select("*").single();
    throwIfError(error, "attendance check-in create");

    return toAttendanceRecord(data as AttendanceRow);
  },

  markMyCheckOut: async (): Promise<AttendanceRecord> => {
    const client = assertSupabase();
    const todayRecord = await hrService.getMyTodayAttendance();

    if (!todayRecord) {
      throw new Error("Check in first before marking check out.");
    }

    if (todayRecord.checkOut !== "--") {
      return todayRecord;
    }

    const { data, error } = await client
      .from("attendance_records")
      .update({ check_out: getLocalTimeLabel() })
      .eq("id", todayRecord.id)
      .select("*")
      .single();

    throwIfError(error, "attendance check-out update");
    return toAttendanceRecord(data as AttendanceRow);
  },
};
