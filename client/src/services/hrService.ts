import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/functions-js";
import type {
  AdminRequest,
  AdminRequestPayload,
  AdminRequestStatus,
  AdminRequestType,
  AdminCommandCenter,
  Announcement,
  AnnouncementAudience,
  AttendanceCorrectionRequestPayload,
  AttendanceCheckInMode,
  AttendanceRecord,
  AttendanceSummary,
  Candidate,
  CRMSettings,
  CreateEmployeeResult,
  DashboardOverview,
  DocumentDispatchResult,
  EmployeeCommandCenter,
  Employee,
  EmployeeInviteResult,
  EmployeeProfileDetailsPayload,
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
  Notification,
  NotificationRole,
  PriorityItem,
  NewAnnouncementPayload,
  ShiftApprovalStatus,
  ShiftCode,
  Task,
  TaskPriority,
  TaskSummary,
  TaskStatus,
  NewTaskPayload,
} from "../types/hr";
import { seedAnnouncements, seedNotifications } from "../data/mockData";
import { supabase } from "./supabaseClient";
import { getLocalDateKey, getLocalTimeLabel } from "../utils/formatters";
import {
  DEFAULT_SHIFT_APPROVAL_STATUS,
  DEFAULT_SHIFT_CODE,
  getApprovedShiftDefinition,
} from "../utils/shifts";

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
  shift_code?: ShiftCode | null;
  shift_approval_status?: ShiftApprovalStatus | null;
  avg_time_on_system_minutes: number | null;
}

interface EmployeePrivateDetailsRow {
  employee_id: string;
  mobile: string | null;
  address: string | null;
  pan: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
}

interface AttendanceRow {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  status: AttendanceRecord["status"];
  check_in_at: string | null;
  check_out_at: string | null;
  break_minutes: number | null;
  time_on_system_minutes: number | null;
  break_summary: AttendanceRecord["breakSummary"];
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
  compensated: boolean | null;
}

interface RequestRow {
  id: string;
  employee_id: string;
  employee_name: string;
  type: AdminRequestType;
  payload: AdminRequestPayload | null;
  reason: string;
  status: AdminRequestStatus;
  created_at: string;
  admin_comment: string | null;
}

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  role: string;
  source: string;
  stage: Candidate["stage"];
  interview_date: string;
  rating: number;
  offer_letter_sent_at: string | null;
  offer_letter_file_name: string | null;
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
  payslip_sent_at: string | null;
  payslip_file_name: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by: string;
  created_by_email: string | null;
  created_at: string;
}

interface NotificationRow {
  id: string;
  role: NotificationRole;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface AnnouncementRow {
  id: string;
  audience: AnnouncementAudience;
  title: string;
  message: string;
  tone: Announcement["tone"];
  graphic_url?: string | null;
  graphic_alt?: string | null;
  cta_label: string | null;
  cta_path: string | null;
  created_at: string;
}

interface InviteEmployeeFunctionResponse {
  status: EmployeeInviteResult["status"];
  message: string;
  userId?: string | null;
}

interface DocumentDispatchFunctionResponse {
  status: DocumentDispatchResult["status"];
  message: string;
  fileName?: string | null;
}

interface PayslipDownloadFunctionResponse {
  status: "ready" | "failed" | "skipped";
  message: string;
  fileName?: string | null;
  fileBase64?: string | null;
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
let notificationsTableCache: "notifications" | "alerts" | null = null;
let announcementsTableAvailable = true;
let announcementGraphicsAvailable = true;
let announcementGraphicAltAvailable = true;
const ANNOUNCEMENT_MEDIA_MARKER = "\n\n__HRCRM_MEDIA__:";

export const NEW_USER_EMPLOYEE_SETUP_MESSAGE =
  "New user detected. Ask an admin to add you as an employee before continuing.";

export function isNewUserEmployeeSetupError(message: string | null | undefined): boolean {
  const value = message?.toLowerCase() ?? "";
  return (
    value.includes(NEW_USER_EMPLOYEE_SETUP_MESSAGE.toLowerCase()) ||
    value.includes('row-level security policy for table "employees"') ||
    value.includes("employee auto-provision failed")
  );
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

function isMissingTableError(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("does not exist") || normalized.includes("relation");
}

function isMissingColumnError(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("column") && normalized.includes("does not exist");
}

function isMissingAnnouncementGraphicAltError(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("graphic_alt") && (normalized.includes("schema cache") || normalized.includes("column") || normalized.includes("does not exist"));
}

function isMissingAnnouncementGraphicUrlError(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("graphic_url") && (normalized.includes("schema cache") || normalized.includes("column") || normalized.includes("does not exist"));
}

function encodeAnnouncementMedia(media: { graphicUrl: string; graphicAlt: string | null }): string {
  return `${ANNOUNCEMENT_MEDIA_MARKER}${encodeURIComponent(JSON.stringify(media))}`;
}

function decodeAnnouncementMedia(message: string): { message: string; graphicUrl: string | null; graphicAlt: string | null } {
  const markerIndex = message.lastIndexOf(ANNOUNCEMENT_MEDIA_MARKER);

  if (markerIndex === -1) {
    return { message, graphicUrl: null, graphicAlt: null };
  }

  const visibleMessage = message.slice(0, markerIndex).trimEnd();
  const encodedPayload = message.slice(markerIndex + ANNOUNCEMENT_MEDIA_MARKER.length).trim();

  if (!encodedPayload) {
    return { message: visibleMessage || message, graphicUrl: null, graphicAlt: null };
  }

  try {
    const payload = JSON.parse(decodeURIComponent(encodedPayload)) as { graphicUrl?: unknown; graphicAlt?: unknown };
    const graphicUrl = normalizeAnnouncementText(typeof payload.graphicUrl === "string" ? payload.graphicUrl : null);
    const graphicAlt = normalizeAnnouncementText(typeof payload.graphicAlt === "string" ? payload.graphicAlt : null);
    return {
      message: visibleMessage || message,
      graphicUrl,
      graphicAlt,
    };
  } catch {
    return { message, graphicUrl: null, graphicAlt: null };
  }
}

async function extractFunctionErrorMessage(response: Response | undefined): Promise<string | null> {
  if (!response) {
    return null;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const text = await response.text().catch(() => "");
  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(text) as Record<string, unknown>;
      if (typeof payload.message === "string") {
        return payload.message;
      }
      if (typeof payload.error === "string") {
        return payload.error;
      }
      if (typeof (payload.error as { message?: unknown } | undefined)?.message === "string") {
        return (payload.error as { message: string }).message;
      }
    } catch {
      // fall back to raw text
    }
  }

  return text;
}

async function resolveFunctionError(functionName: string, error: unknown): Promise<Error> {
  if (error instanceof FunctionsFetchError) {
    return new Error(
      `${functionName} failed because the Edge Function could not be reached. Deploy or run Supabase Edge Functions and ensure the functions URL is reachable from this browser.`,
    );
  }

  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    const message = await extractFunctionErrorMessage(error.context);
    if (message) {
      return new Error(message);
    }
    const status = error.context?.status;
    return new Error(
      `Edge Function ${functionName} returned an error${status ? ` (status ${status})` : ""}.`,
    );
  }

  return error instanceof Error ? error : new Error(`Unexpected error invoking ${functionName}.`);
}

async function invokeEdgeFunction<TResponse>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke<TResponse>(functionName, {
    body,
  });

  if (error) {
    throw await resolveFunctionError(functionName, error);
  }

  if (!data) {
    throw new Error(`${functionName} returned no data.`);
  }

  return data;
}

async function fetchNotificationsTable(role: NotificationRole, table: "notifications" | "alerts") {
  const client = assertSupabase();
  const { data, error } = await client
    .from(table)
    .select("id, role, title, message, read, created_at")
    .eq("role", role)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toNotification(row as NotificationRow));
}

async function fetchAnnouncements(role: AnnouncementAudience): Promise<Announcement[]> {
  const client = assertSupabase();
  const { data, error } = await client
    .from("announcements")
    .select("*")
    .in("audience", role === "all" ? ["all"] : ["all", role])
    .order("created_at", { ascending: false });

  if (error) {
    if (announcementGraphicsAvailable && isMissingColumnError(error.message)) {
      announcementGraphicsAvailable = false;
      return fetchAnnouncements(role);
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row: AnnouncementRow) => toAnnouncement(row));
}

async function fetchAdminAnnouncements(): Promise<Announcement[]> {
  const client = assertSupabase();
  const { data, error } = await client.from("announcements").select("*").order("created_at", { ascending: false });

  if (error) {
    if (announcementGraphicsAvailable && isMissingColumnError(error.message)) {
      announcementGraphicsAvailable = false;
      return fetchAdminAnnouncements();
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row: AnnouncementRow) => toAnnouncement(row));
}

function normalizeAnnouncementText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function insertAnnouncement(input: NewAnnouncementPayload): Promise<Announcement> {
  const client = assertSupabase();

  if (!announcementsTableAvailable) {
    throw new Error("Announcements are not available in Supabase. Run supabase/schema.sql before publishing workspace updates.");
  }

  const graphicUrl = normalizeAnnouncementText(input.graphicUrl);
  const graphicAlt = graphicUrl ? normalizeAnnouncementText(input.graphicAlt) : null;
  const graphicAltForColumn = graphicUrl && announcementGraphicAltAvailable ? graphicAlt : null;
  const ctaLabel = normalizeAnnouncementText(input.ctaLabel);
  const ctaPath = normalizeAnnouncementText(input.ctaPath);
  const includeGraphics = announcementGraphicsAvailable;
  const message = input.message.trim();
  const messageWithEmbeddedMedia = graphicUrl ? encodeAnnouncementMedia({ graphicUrl, graphicAlt }) : message;

  const row: Record<string, unknown> = {
    id: createId("ANN"),
    audience: input.audience,
    title: input.title.trim(),
    message: includeGraphics ? message : messageWithEmbeddedMedia,
    tone: input.tone,
    cta_label: ctaLabel,
    cta_path: ctaPath,
    created_at: new Date().toISOString(),
  };

  if (includeGraphics) {
    row.graphic_url = graphicUrl;
    if (graphicAltForColumn !== null) {
      row.graphic_alt = graphicAltForColumn;
    }
  }

  const { data, error } = await client.from("announcements")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (includeGraphics && announcementGraphicsAvailable && isMissingAnnouncementGraphicUrlError(error.message)) {
      announcementGraphicsAvailable = false;
      return insertAnnouncement(input);
    }

    if (includeGraphics && announcementGraphicAltAvailable && isMissingAnnouncementGraphicAltError(error.message)) {
      announcementGraphicAltAvailable = false;
      return insertAnnouncement(input);
    }

    throw new Error(error.message);
  }

  return toAnnouncement(data as AnnouncementRow);
}

async function sendEmployeeInvite(input: {
  employeeId: string;
  email: string;
  fullName: string;
  role: string;
}): Promise<EmployeeInviteResult> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const data = await invokeEdgeFunction<InviteEmployeeFunctionResponse>("invite-employee", {
    employeeId: input.employeeId,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    redirectTo,
  });

  return {
    status: data.status,
    message: data.message,
    userId: data.userId ?? null,
  };
}

async function updateNotificationsRead(role: NotificationRole, table: "notifications" | "alerts") {
  const client = assertSupabase();
  const { error } = await client
    .from(table)
    .update({ read: true })
    .eq("role", role)
    .eq("read", false);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeProfileDetailsPayload(payload: EmployeeProfileDetailsPayload): EmployeeProfileDetailsPayload {
  return {
    mobile: payload.mobile.trim(),
    address: payload.address.trim(),
    pan: payload.pan.trim().toUpperCase(),
    bankName: payload.bankName.trim(),
    bankAccountNumber: payload.bankAccountNumber.trim(),
  };
}

async function fetchEmployeePrivateDetailsMap(employeeIds: string[]): Promise<Map<string, EmployeePrivateDetailsRow>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from("employee_private_details")
    .select("employee_id, mobile, address, pan, bank_name, bank_account_number")
    .in("employee_id", employeeIds);

  if (error) {
    if (isMissingTableError(error.message)) {
      return new Map();
    }
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((row) => {
      const details = row as EmployeePrivateDetailsRow;
      return [details.employee_id, details];
    }),
  );
}

async function enrichEmployees(rows: EmployeeRow[]): Promise<Employee[]> {
  const detailsMap = await fetchEmployeePrivateDetailsMap(rows.map((row) => row.id));
  return rows.map((row) => toEmployee(row, detailsMap.get(row.id)));
}

async function enrichEmployee(row: EmployeeRow): Promise<Employee> {
  const detailsMap = await fetchEmployeePrivateDetailsMap([row.id]);
  return toEmployee(row, detailsMap.get(row.id));
}

async function fetchEmployeeById(employeeId: string): Promise<Employee | null> {
  const client = assertSupabase();
  const { data, error } = await client.from("employees").select("*").eq("id", employeeId).maybeSingle();
  throwIfError(error, "employee by id fetch");

  if (!data) {
    return null;
  }

  return enrichEmployee(data as EmployeeRow);
}

async function invokeDocumentDispatch<TBody extends Record<string, unknown>>(
  functionName: string,
  body: TBody,
): Promise<DocumentDispatchResult> {
  const data = await invokeEdgeFunction<DocumentDispatchFunctionResponse>(functionName, body);

  return {
    status: data.status,
    message: data.message,
    fileName: data.fileName ?? null,
  };
}

function toEmployee(row: EmployeeRow, details?: EmployeePrivateDetailsRow | null): Employee {
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
    shiftCode: row.shift_code ?? DEFAULT_SHIFT_CODE,
    shiftApprovalStatus: row.shift_approval_status ?? DEFAULT_SHIFT_APPROVAL_STATUS,
    avgTimeOnSystemMinutes: row.avg_time_on_system_minutes ?? 0,
    mobile: details?.mobile ?? null,
    address: details?.address ?? null,
    pan: details?.pan ?? null,
    bankName: details?.bank_name ?? null,
    bankAccountNumber: details?.bank_account_number ?? null,
  };
}

function toAttendanceRecord(row: AttendanceRow): AttendanceRecord {
  const normalizeTime = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "--";
  };
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    date: row.date,
    checkIn: normalizeTime(row.check_in),
    checkOut: normalizeTime(row.check_out),
    status: row.status,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    breakMinutes: row.break_minutes ?? 0,
    timeOnSystemMinutes: row.time_on_system_minutes ?? 0,
    breakSummary: row.break_summary ?? null,
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
    compensated: Boolean(row.compensated),
  };
}

function toAdminRequest(row: RequestRow): AdminRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    type: row.type,
    payload: row.payload ?? {},
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    adminComment: row.admin_comment,
  };
}

function isAttendanceCorrectionPayload(
  payload: AdminRequestPayload | null | undefined,
): payload is AttendanceCorrectionRequestPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const value = payload as Record<string, unknown>;
  return (
    typeof value.date === "string" &&
    typeof value.checkIn === "string" &&
    typeof value.checkOut === "string" &&
    typeof value.reason === "string"
  );
}

function toCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    source: row.source,
    stage: row.stage,
    interviewDate: row.interview_date,
    rating: row.rating,
    offerLetterSentAt: row.offer_letter_sent_at,
    offerLetterFileName: row.offer_letter_file_name,
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
    payslipSentAt: row.payslip_sent_at,
    payslipFileName: row.payslip_file_name,
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    role: row.role,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

function toAnnouncement(row: AnnouncementRow): Announcement {
  const decodedMessage = decodeAnnouncementMedia(row.message);
  const graphicUrl = row.graphic_url ?? decodedMessage.graphicUrl ?? null;
  const graphicAlt = row.graphic_alt ?? decodedMessage.graphicAlt ?? null;

  return {
    id: row.id,
    audience: row.audience,
    title: row.title,
    message: decodedMessage.message,
    tone: row.tone,
    graphicUrl,
    graphicAlt,
    ctaLabel: row.cta_label,
    ctaPath: row.cta_path,
    createdAt: row.created_at,
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

function isDuplicateError(error: { message: string; code?: string } | null): boolean {
  if (!error) {
    return false;
  }

  if (error.code === "23505") {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes("duplicate") || message.includes("unique");
}

function isRowLevelSecurityError(error: { message: string; code?: string } | null): boolean {
  if (!error) {
    return false;
  }

  if (error.code === "42501") {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes("row-level security") || message.includes("violates row-level security policy");
}

function createId(prefix: string): string {
  const time = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${time}${random}`;
}

function parsePayrollMonth(value: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01T00:00:00` : `${value} 1`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function getNextPayrollCycleLabel(records: PayrollRecord[]): string | null {
  const latest = [...records]
    .map((record) => parsePayrollMonth(record.month))
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.valueOf() - left.valueOf())[0];

  if (!latest) {
    return null;
  }

  const next = new Date(latest);
  next.setMonth(next.getMonth() + 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(next);
}

function buildAttendanceSummary(records: AttendanceRecord[]): AttendanceSummary {
  return records.reduce(
    (acc, record) => {
      acc[record.status] += 1;
      return acc;
    },
    { present: 0, late: 0, remote: 0, absent: 0 },
  );
}

function isPresentStatus(status: AttendanceRecord["status"]): boolean {
  return status === "present" || status === "remote" || status === "late";
}

function calculateAttendanceStreak(records: AttendanceRecord[]): number {
  const sorted = [...records].sort((left, right) => new Date(right.date).valueOf() - new Date(left.date).valueOf());
  let streak = 0;

  for (const record of sorted) {
    if (!isPresentStatus(record.status)) {
      break;
    }
    streak += 1;
  }

  return streak;
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

function resolveAttendanceStatus(
  mode: AttendanceCheckInMode,
  stamp: Date,
  employee?: Pick<Employee, "shiftCode" | "shiftApprovalStatus"> | null,
): AttendanceRecord["status"] {
  if (mode === "remote") {
    return "remote";
  }

  const totalMinutes = stamp.getHours() * 60 + stamp.getMinutes();
  const approvedShift = getApprovedShiftDefinition(employee);
  const shiftStartMinutes = approvedShift?.startMinutes ?? getApprovedShiftDefinition({
    shiftCode: DEFAULT_SHIFT_CODE,
    shiftApprovalStatus: "approved",
  })?.startMinutes ?? 9 * 60 + 30;

  return totalMinutes > shiftStartMinutes ? "late" : "present";
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
  let requiresAdminEmployeeSetup = false;

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
    shift_code: DEFAULT_SHIFT_CODE,
    shift_approval_status: DEFAULT_SHIFT_APPROVAL_STATUS,
  };

  if (employeesUserIdState !== "missing") {
    const insertWithLink = await client
      .from("employees")
      .insert({ ...baseRow, user_id: user.id })
      .select("*")
      .single();

    if (!insertWithLink.error && insertWithLink.data) {
      employeesUserIdState = "available";
      return enrichEmployee(insertWithLink.data as EmployeeRow);
    }

    if (hasMissingUserIdColumn(insertWithLink.error)) {
      employeesUserIdState = "missing";
    } else if (isRowLevelSecurityError(insertWithLink.error)) {
      requiresAdminEmployeeSetup = true;
    } else {
      const permissionDenied = insertWithLink.error?.message.toLowerCase().includes("permission");

      if (!isDuplicateError(insertWithLink.error) && !permissionDenied) {
        throwIfError(insertWithLink.error, "employee auto-provision");
      }
    }
  }

  const insertWithoutLink = await client.from("employees").insert(baseRow).select("*").single();

  if (!insertWithoutLink.error && insertWithoutLink.data) {
    return enrichEmployee(insertWithoutLink.data as EmployeeRow);
  }

  const permissionDenied = insertWithoutLink.error?.message.toLowerCase().includes("permission");

  if (isRowLevelSecurityError(insertWithoutLink.error)) {
    requiresAdminEmployeeSetup = true;
  } else if (!isDuplicateError(insertWithoutLink.error) && !permissionDenied) {
    throwIfError(insertWithoutLink.error, "employee auto-provision fallback");
  }

  const existing = await client.from("employees").select("*").eq("email", user.email).maybeSingle();
  throwIfError(existing.error, "employee auto-provision duplicate recovery");

  if (existing.data) {
    return enrichEmployee(existing.data as EmployeeRow);
  }

  if (requiresAdminEmployeeSetup) {
    throw new Error(NEW_USER_EMPLOYEE_SETUP_MESSAGE);
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
    shiftCode: DEFAULT_SHIFT_CODE,
    shiftApprovalStatus: DEFAULT_SHIFT_APPROVAL_STATUS,
    avgTimeOnSystemMinutes: 0,
    mobile: null,
    address: null,
    pan: null,
    bankName: null,
    bankAccountNumber: null,
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

async function getIsAdmin(): Promise<boolean> {
  const client = assertSupabase();
  const { data, error } = await client.rpc("is_admin");
  if (error) {
    throw new Error(`Supabase admin check failed: ${error.message}`);
  }
  return Boolean(data);
}

async function assertTaskAssignmentPermission(taskId: string): Promise<void> {
  const client = assertSupabase();
  if (await getIsAdmin()) {
    return;
  }

  const user = await getCurrentUserAuth();
  const { data, error } = await client.from("tasks").select("created_by").eq("id", taskId).single();

  if (error || !data) {
    throw new Error("Unable to verify task assignment permissions.");
  }

  if (data.created_by !== user.id) {
    throw new Error("Only admins or the task's assigned client can assign tasks.");
  }
}

export const hrService = {
  getNotifications: async (role: NotificationRole): Promise<Notification[]> => {
    if (notificationsTableCache) {
      try {
        return await fetchNotificationsTable(role, notificationsTableCache);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isMissingTableError(message)) {
          notificationsTableCache = null;
          return seedNotifications.filter((item) => item.role === role);
        }
        throw error;
      }
    }

    try {
      const data = await fetchNotificationsTable(role, "notifications");
      notificationsTableCache = "notifications";
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingTableError(message)) {
        try {
          const data = await fetchNotificationsTable(role, "alerts");
          notificationsTableCache = "alerts";
          return data;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          if (isMissingTableError(fallbackMessage)) {
            return seedNotifications.filter((item) => item.role === role);
          }
          throw fallbackError;
        }
      }
      throw error;
    }
  },

  markNotificationsRead: async (role: NotificationRole): Promise<void> => {
    const preferred = notificationsTableCache ?? "notifications";
    try {
      await updateNotificationsRead(role, preferred);
      notificationsTableCache = preferred;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (preferred === "notifications" && isMissingTableError(message)) {
        await updateNotificationsRead(role, "alerts");
        notificationsTableCache = "alerts";
        return;
      }
      if (isMissingTableError(message)) {
        return;
      }
      throw error;
    }
  },

  getAnnouncements: async (role: AnnouncementAudience): Promise<Announcement[]> => {
    if (!announcementsTableAvailable) {
      return seedAnnouncements.filter((item) => item.audience === "all" || item.audience === role);
    }

    try {
      return await fetchAnnouncements(role);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingTableError(message)) {
        announcementsTableAvailable = false;
        return seedAnnouncements.filter((item) => item.audience === "all" || item.audience === role);
      }
      throw error;
    }
  },

  getAllAnnouncements: async (): Promise<Announcement[]> => {
    if (!announcementsTableAvailable) {
      return seedAnnouncements;
    }

    try {
      return await fetchAdminAnnouncements();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingTableError(message)) {
        announcementsTableAvailable = false;
        return seedAnnouncements;
      }
      throw error;
    }
  },

  createAnnouncement: async (payload: NewAnnouncementPayload): Promise<Announcement> => {
    return insertAnnouncement(payload);
  },

  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const client = assertSupabase();

    const [employeesResult, leaveResult, candidatesResult, attendanceResult, payrollResult, tasksResult] = await Promise.all([
      client.from("employees").select("id, status, join_date"),
      client.from("leave_requests").select("id, status"),
      client.from("candidates").select("id, stage, interview_date"),
      client.from("attendance_records").select("id, status"),
      client.from("payroll_records").select("id, net_pay"),
      client.from("tasks").select("id, status, title, due_date"),
    ]);

    throwIfError(employeesResult.error, "employees fetch");
    throwIfError(leaveResult.error, "leave requests fetch");
    throwIfError(candidatesResult.error, "candidates fetch");
    throwIfError(attendanceResult.error, "attendance fetch");
    throwIfError(payrollResult.error, "payroll fetch");
    throwIfError(tasksResult.error, "tasks fetch");

    const employees = employeesResult.data ?? [];
    const leaves = leaveResult.data ?? [];
    const candidates = candidatesResult.data ?? [];
    const attendance = attendanceResult.data ?? [];
    const payroll = payrollResult.data ?? [];
    const tasks = tasksResult.data ?? [];

    const todayKey = getLocalDateKey();
    const today = new Date(`${todayKey}T00:00:00`);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthStartKey = getLocalDateKey(monthStart);
    const monthEndKey = getLocalDateKey(monthEnd);
    const toDateKey = (value?: string | null): string | null => {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.valueOf())) {
        return getLocalDateKey(parsed);
      }
      if (value.length >= 10) {
        return value.slice(0, 10);
      }
      return null;
    };

    const presentCount = attendance.filter(
      (record) => record.status === "present" || record.status === "remote",
    ).length;
    const payrollTotal = payroll.reduce((sum, row) => sum + Number(row.net_pay ?? 0), 0);

    const newHires = employees.filter((employee) => {
      const joinKey = toDateKey(employee.join_date);
      return Boolean(joinKey && joinKey >= monthStartKey && joinKey <= monthEndKey);
    }).length;
    const interviewsScheduled = candidates.filter((candidate) => {
      const interviewKey = toDateKey(candidate.interview_date);
      return Boolean(
        candidate.stage === "interview" &&
          interviewKey &&
          interviewKey >= todayKey &&
          interviewKey <= monthEndKey,
      );
    }).length;
    const performanceReviewsDue = tasks.length;

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
        { title: "New hires this month", value: newHires },
        { title: "Interviews scheduled", value: interviewsScheduled },
        { title: "tasks scheduled", value: performanceReviewsDue },
      ],
    };
  },

  getAdminCommandCenterData: async (): Promise<AdminCommandCenter> => {
    const [employees, leaveRequests, candidates, attendanceRecords, payrollRecords, tasks] = await Promise.all([
      hrService.getEmployees(),
      hrService.getLeaveRequests(),
      hrService.getCandidates(),
      hrService.getAttendanceRecords(),
      hrService.getPayrollRecords(),
      hrService.getTasks(),
    ]);

    const departmentSnapshots = Array.from(
      employees.reduce((map, employee) => {
        const current = map.get(employee.department) ?? {
          department: employee.department,
          headcount: 0,
          activeCount: 0,
          leaveCount: 0,
          payrollTotal: 0,
          avgPerformance: 0,
          totalPerformance: 0,
        };

        current.headcount += 1;
        if (employee.status === "active") {
          current.activeCount += 1;
        }
        current.totalPerformance += employee.performanceScore;
        map.set(employee.department, current);
        return map;
      }, new Map<string, {
        department: string;
        headcount: number;
        activeCount: number;
        leaveCount: number;
        payrollTotal: number;
        avgPerformance: number;
        totalPerformance: number;
      }>()),
    )
      .map(([, department]) => {
        department.leaveCount = leaveRequests.filter(
          (leave) => leave.status === "pending" && employees.find((employee) => employee.id === leave.employeeId)?.department === department.department,
        ).length;
        department.payrollTotal = payrollRecords
          .filter((record) => record.department === department.department)
          .reduce((sum, record) => sum + record.netPay, 0);
        department.avgPerformance = Math.round(department.totalPerformance / Math.max(department.headcount, 1));

        return {
          department: department.department,
          headcount: department.headcount,
          activeCount: department.activeCount,
          leaveCount: department.leaveCount,
          payrollTotal: department.payrollTotal,
          avgPerformance: department.avgPerformance,
        };
      })
      .sort((left, right) => right.headcount - left.headcount)
      .slice(0, 4);

    const today = getLocalDateKey();
    const taskSummary: TaskSummary = tasks.reduce(
      (acc, task) => {
        if (task.status === "todo") {
          acc.todo += 1;
        } else if (task.status === "in_progress") {
          acc.inProgress += 1;
        } else if (task.status === "blocked") {
          acc.blocked += 1;
        } else if (task.status === "done") {
          acc.done += 1;
        }

        if (task.priority === "critical") {
          acc.critical += 1;
        }

        if (task.dueDate && task.dueDate < today && task.status !== "done") {
          acc.overdue += 1;
        }

        return acc;
      },
      { todo: 0, inProgress: 0, blocked: 0, done: 0, overdue: 0, critical: 0 },
    );

    const attendanceBreakdown = buildAttendanceSummary(attendanceRecords);
    const candidatePipeline = (["sourced", "interview", "offer", "hired", "rejected"] as const).map((stage) => ({
      stage,
      count: candidates.filter((candidate) => candidate.stage === stage).length,
    }));

    const payrollHealth = {
      scheduledCount: payrollRecords.filter((record) => record.status === "scheduled").length,
      processedCount: payrollRecords.filter((record) => record.status === "processed").length,
      scheduledExposure: payrollRecords
        .filter((record) => record.status === "scheduled")
        .reduce((sum, record) => sum + record.netPay, 0),
      averageNetPay:
        payrollRecords.length > 0
          ? payrollRecords.reduce((sum, record) => sum + record.netPay, 0) / payrollRecords.length
          : 0,
      highestNetPay: payrollRecords.reduce((highest, record) => Math.max(highest, record.netPay), 0),
      nextCycleLabel: getNextPayrollCycleLabel(payrollRecords),
    };

    const priorityItems: PriorityItem[] = [
      {
        id: "priority-leave",
        title: "Pending leave queue",
        value: `${leaveRequests.filter((leave) => leave.status === "pending").length} requests`,
        meta: "Review approvals before the next roster lock.",
        route: "/admin/leave",
        tone: "warning",
      },
      {
        id: "priority-tasks",
        title: "Blocked task recovery",
        value: `${taskSummary.blocked} blocked`,
        meta: `${taskSummary.critical} critical priority tasks need owner attention.`,
        route: "/admin/tasks",
        tone: taskSummary.blocked > 0 ? "critical" : "info",
      },
      {
        id: "priority-payroll",
        title: "Scheduled payroll exposure",
        value: `${payrollHealth.scheduledCount} scheduled`,
        meta: `${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(payrollHealth.scheduledExposure)} waiting for processing.`,
        route: "/admin/payroll",
        tone: payrollHealth.scheduledCount > 0 ? "success" : "info",
      },
      {
        id: "priority-recruitment",
        title: "Recruiting pipeline",
        value: `${candidates.filter((candidate) => candidate.stage !== "rejected").length} active`,
        meta: `${candidatePipeline.find((item) => item.stage === "interview")?.count ?? 0} interviews in motion.`,
        route: "/admin/recruitment",
        tone: "info",
      },
    ];

    return {
      departmentSnapshots,
      taskSummary,
      payrollHealth,
      attendanceBreakdown,
      candidatePipeline,
      priorityItems,
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

    return enrichEmployees((data ?? []) as EmployeeRow[]);
  },

  createEmployee: async (payload: NewEmployeePayload): Promise<CreateEmployeeResult> => {
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
      shift_code: payload.shiftCode ?? DEFAULT_SHIFT_CODE,
      shift_approval_status: DEFAULT_SHIFT_APPROVAL_STATUS,
      avg_time_on_system_minutes: 0,
    };

    const { data, error } = await client.from("employees").insert(row).select("*").single();
    throwIfError(error, "employee create");

    const employee = await enrichEmployee(data as EmployeeRow);

    try {
      const invite = await sendEmployeeInvite({
        employeeId: employee.id,
        email: employee.email,
        fullName: employee.name,
        role: employee.role,
      });

      return { employee, invite };
    } catch (inviteError) {
      return {
        employee,
        invite: {
          status: "failed",
          message:
            inviteError instanceof Error
              ? inviteError.message
              : "Employee created, but the invite email could not be sent.",
          userId: employee.userId,
        },
      };
    }
  },

  upsertMyProfileDetails: async (payload: EmployeeProfileDetailsPayload): Promise<Employee> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const normalized = normalizeProfileDetailsPayload(payload);

    const { error } = await client.from("employee_private_details").upsert(
      {
        employee_id: employee.id,
        mobile: normalized.mobile,
        address: normalized.address,
        pan: normalized.pan,
        bank_name: normalized.bankName,
        bank_account_number: normalized.bankAccountNumber,
      },
      { onConflict: "employee_id" },
    );

    throwIfError(error, "employee private details upsert");

    const freshEmployee = await fetchEmployeeById(employee.id);
    if (!freshEmployee) {
      const mergedEmployee = {
        ...employee,
        ...normalized,
      };

      if (employee.userId) {
        currentEmployeeCache = { userId: employee.userId, employee: mergedEmployee };
      }

      return mergedEmployee;
    }

    if (freshEmployee.userId) {
      currentEmployeeCache = { userId: freshEmployee.userId, employee: freshEmployee };
    }

    return freshEmployee;
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
        shift_code: payload.shiftCode ?? DEFAULT_SHIFT_CODE,
        shift_approval_status: payload.shiftCode ? payload.shiftApprovalStatus : DEFAULT_SHIFT_APPROVAL_STATUS,
      })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "employee update");
    return enrichEmployee(data as EmployeeRow);
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
    return enrichEmployee(data as EmployeeRow);
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
    const { data: existing, error: fetchError } = await client
      .from("attendance_records")
      .select("date")
      .eq("id", id)
      .single();
    throwIfError(fetchError, "attendance record fetch");

    const dateKey = existing?.date as string | undefined;
    const toTimestamp = (value: string) => {
      if (!dateKey || value === "--") {
        return null;
      }
      return new Date(`${dateKey}T${value}:00`).toISOString();
    };

    const { data, error } = await client
      .from("attendance_records")
      .update({
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        status: payload.status,
        check_in_at: toTimestamp(payload.checkIn),
        check_out_at: toTimestamp(payload.checkOut),
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

  updateLeaveCompensation: async (id: string, compensated: boolean): Promise<LeaveRequest> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("leave_requests")
      .update({ compensated })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "leave compensation update");
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
      email: payload.email,
      role: payload.role,
      source: payload.source,
      stage: payload.stage,
      interview_date: payload.interviewDate,
      rating: payload.rating,
      offer_letter_sent_at: null,
      offer_letter_file_name: null,
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

  dispatchCandidateOfferLetter: async (candidateId: string): Promise<DocumentDispatchResult> => {
    return invokeDocumentDispatch("send-offer-letter", { candidateId });
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
      payslip_sent_at: null,
      payslip_file_name: null,
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

  dispatchPayrollPayslip: async (payrollRecordId: string): Promise<DocumentDispatchResult> => {
    return invokeDocumentDispatch("send-payslip", { payrollRecordId });
  },

  downloadPayrollPayslip: async (payrollRecordId: string): Promise<{ fileName: string; fileBase64: string }> => {
    const data = await invokeEdgeFunction<PayslipDownloadFunctionResponse>("download-payslip", {
      payrollRecordId,
    });

    if (data.status !== "ready" || !data.fileBase64) {
      throw new Error(data.message || "Payslip not ready for download.");
    }

    return {
      fileName: data.fileName ?? "salary-slip.pdf",
      fileBase64: data.fileBase64,
    };
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

  getTasks: async (): Promise<Task[]> => {
    const client = assertSupabase();
    const { data, error } = await client.from("tasks").select("*").order("created_at", { ascending: false });
    throwIfError(error, "tasks fetch");
    return (data ?? []).map((row) => toTask(row as TaskRow));
  },

  createTask: async (payload: NewTaskPayload): Promise<Task> => {
    const client = assertSupabase();
    const user = await getCurrentUserAuth();
    const row: TaskRow = {
      id: createId("TSK"),
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status,
      priority: payload.priority,
      due_date: payload.dueDate ?? null,
      assignee_id: payload.assigneeId ?? null,
      assignee_name: payload.assigneeName ?? null,
      created_by: user.id,
      created_by_email: user.email,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("tasks").insert(row).select("*").single();
    throwIfError(error, "task create");
    return toTask(data as TaskRow);
  },

  updateTaskStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "task status update");
    return toTask(data as TaskRow);
  },

  updateTask: async (id: string, updates: Partial<NewTaskPayload>): Promise<Task> => {
    const client = assertSupabase();
    const patch: Partial<TaskRow> = {};
    const isAssignmentUpdate = updates.assigneeId !== undefined || updates.assigneeName !== undefined;

    if (updates.title !== undefined) {
      patch.title = updates.title;
    }
    if (updates.description !== undefined) {
      patch.description = updates.description ?? null;
    }
    if (updates.status !== undefined) {
      patch.status = updates.status;
    }
    if (updates.priority !== undefined) {
      patch.priority = updates.priority;
    }
    if (updates.dueDate !== undefined) {
      patch.due_date = updates.dueDate ?? null;
    }
    if (updates.assigneeId !== undefined) {
      patch.assignee_id = updates.assigneeId ?? null;
    }
    if (updates.assigneeName !== undefined) {
      patch.assignee_name = updates.assigneeName ?? null;
    }

    if (isAssignmentUpdate) {
      await assertTaskAssignmentPermission(id);
    }

    const { data, error } = await client
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    throwIfError(error, "task update");
    return toTask(data as TaskRow);
  },

  deleteTask: async (id: string): Promise<void> => {
    const client = assertSupabase();
    const { error } = await client.from("tasks").delete().eq("id", id);
    throwIfError(error, "task delete");
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
          return enrichEmployee(data as EmployeeRow);
        }
      }

      if (user.email) {
        const fallback = await client.from("employees").select("*").eq("email", user.email).maybeSingle();
        throwIfError(fallback.error, "employee profile fallback fetch");

        if (fallback.data) {
          const employee = await enrichEmployee(fallback.data as EmployeeRow);

          if (!employee.userId) {
            try {
              await linkEmployeeToUser(employee.id, user.id);
              const linkedEmployee = { ...employee, userId: user.id };
              currentEmployeeCache = { userId: user.id, employee: linkedEmployee };
              return linkedEmployee;
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
      .eq("employee_id", employee.id)
      .order("date", { ascending: false });

    throwIfError(error, "my attendance fetch");
    return (data ?? []).map((row) => toAttendanceRecord(row as AttendanceRow));
  },

  getMyTodayAttendance: async (): Promise<AttendanceRecord | null> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const today = getLocalDateKey();

    const { data, error } = await client
      .from("attendance_records")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .maybeSingle();

    throwIfError(error, "my attendance today fetch");
    return data ? toAttendanceRecord(data as AttendanceRow) : null;
  },

  getMyAttendanceSummary: async (): Promise<AttendanceSummary> => {
    const records = await hrService.getMyAttendanceRecords();
    return buildAttendanceSummary(records);
  },

  getHolidayDatesForMonth: async (month: Date): Promise<string[]> => {
    const client = assertSupabase();
    const start = getLocalDateKey(new Date(month.getFullYear(), month.getMonth(), 1));
    const end = getLocalDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));

    const extractDate = (row: Record<string, unknown>) => {
      const candidate =
        (row.date as string | undefined) ??
        (row.holiday_date as string | undefined) ??
        (row.holidayDate as string | undefined) ??
        (row.day as string | undefined);
      return typeof candidate === "string" ? candidate : null;
    };

    const tryFetch = async (table: string) => {
      const { data, error } = await client.from(table).select("*");
      if (error) {
        throw error;
      }
      return (data ?? [])
        .map((row) => extractDate(row as Record<string, unknown>))
        .filter((value): value is string => Boolean(value))
        .filter((value) => value >= start && value <= end);
    };

    const tables = ["company_holidays", "public_holidays", "holiday_calendar"];
    for (const table of tables) {
      try {
        const dates = await tryFetch(table);
        if (dates.length > 0) {
          return dates;
        }
      } catch {
        // Try next table if current one does not exist or errors out.
      }
    }

    return [];
  },

  getMyLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { data, error } = await client
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employee.id)
      .order("start_date", { ascending: false });

    throwIfError(error, "my leave fetch");
    return (data ?? []).map((row) => toLeaveRequest(row as LeaveRequestRow));
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
      compensated: false,
    };

    const { data, error } = await client.from("leave_requests").insert(row).select("*").single();
    throwIfError(error, "leave request create");

    return toLeaveRequest(data as LeaveRequestRow);
  },

  deleteMyLeaveRequest: async (id: string): Promise<void> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { error } = await client
      .from("leave_requests")
      .delete()
      .eq("id", id)
      .eq("employee_id", employee.id)
      .eq("status", "pending");
    throwIfError(error, "leave request delete");
  },

  createCorrectionRequest: async (payload: AttendanceCorrectionRequestPayload): Promise<AdminRequest> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const normalizedPayload: AttendanceCorrectionRequestPayload = {
      ...payload,
      reason: payload.reason.trim(),
    };

    if (!normalizedPayload.date) {
      throw new Error("Choose the attendance date that needs correction.");
    }

    if (!normalizedPayload.reason) {
      throw new Error("Add a short note so the admin can review your correction request.");
    }

    const { data: existingRequests, error: existingRequestsError } = await client
      .from("requests")
      .select("id, payload")
      .eq("employee_id", employee.id)
      .eq("type", "attendance_correction")
      .eq("status", "pending");

    throwIfError(existingRequestsError, "correction request duplicate check");

    const hasDuplicatePendingRequest = (existingRequests ?? []).some((requestRow) => {
      const requestPayload = (requestRow as { payload?: AdminRequestPayload | null }).payload;
      return isAttendanceCorrectionPayload(requestPayload) && requestPayload.date === normalizedPayload.date;
    });

    if (hasDuplicatePendingRequest) {
      throw new Error("A correction request for this date is already pending review.");
    }

    const row = {
      id: createId("REQ"),
      employee_id: employee.id,
      employee_name: employee.name,
      type: "attendance_correction",
      payload: normalizedPayload,
      reason: normalizedPayload.reason,
      status: "pending",
    };

    const { data, error } = await client.from("requests").insert(row).select("*").single();
    throwIfError(error, "correction request create");
    return toAdminRequest(data as RequestRow);
  },

  getRequests: async (): Promise<AdminRequest[]> => {
    const client = assertSupabase();
    const { data, error } = await client
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    throwIfError(error, "requests fetch");
    return (data ?? []).map((row) => toAdminRequest(row as RequestRow));
  },

  updateRequestStatus: async (id: string, status: "approved" | "rejected", comment?: string): Promise<void> => {
    const client = assertSupabase();
    const { data: request, error: fetchError } = await client.from("requests").select("*").eq("id", id).single();
    throwIfError(fetchError, "request fetch");

    const requestRow = request as RequestRow;

    if (status === "approved" && requestRow.type === "attendance_correction" && isAttendanceCorrectionPayload(requestRow.payload)) {
      const p = requestRow.payload;
      const correctedStatus: AttendanceRecord["status"] =
        p.checkIn === "--" && p.checkOut === "--" ? "absent" : "present";
      const toTimestamp = (value: string) => (value === "--" ? null : new Date(`${p.date}T${value}:00`).toISOString());

      const { data: existing, error: existingError } = await client
        .from("attendance_records")
        .select("id")
        .eq("employee_id", requestRow.employee_id)
        .eq("date", p.date)
        .maybeSingle();

      throwIfError(existingError, "attendance correction lookup");
      
      const updateData = {
        check_in: p.checkIn,
        check_out: p.checkOut,
        status: correctedStatus,
        check_in_at: toTimestamp(p.checkIn),
        check_out_at: toTimestamp(p.checkOut),
      };

      if (existing) {
        const { error: updateError } = await client
          .from("attendance_records")
          .update(updateData)
          .eq("id", existing.id);
        throwIfError(updateError, "attendance correction apply");
      } else {
        const { error: insertError } = await client.from("attendance_records").insert({
          id: createId("ATT"),
          employee_id: requestRow.employee_id,
          employee_name: requestRow.employee_name,
          date: p.date,
          ...updateData
        });
        throwIfError(insertError, "attendance correction apply");
      }
    }

    const { error } = await client
      .from("requests")
      .update({ status, admin_comment: comment?.trim() || null })
      .eq("id", id);
    throwIfError(error, "request status update");
  },

  autoCheckoutStaleSessions: async (): Promise<number> => {
    const client = assertSupabase();
    const { data, error } = await client.rpc("auto_checkout_stale_sessions");
    throwIfError(error, "auto checkout call");
    return data || 0;
  },

  getMyPayrollRecords: async (): Promise<PayrollRecord[]> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const { data, error } = await client
      .from("payroll_records")
      .select("*")
      .eq("employee_id", employee.id)
      .order("month", { ascending: false });

    throwIfError(error, "my payroll fetch");
    const records = (data ?? []).map((row) => toPayrollRecord(row as PayrollRow));

    if (records.length > 0 || !employee.name) {
      return records;
    }

    const { data: fallback, error: fallbackError } = await client
      .from("payroll_records")
      .select("*")
      .eq("employee_name", employee.name)
      .order("month", { ascending: false });

    throwIfError(fallbackError, "my payroll fetch fallback");
    return (fallback ?? []).map((row) => toPayrollRecord(row as PayrollRow));
  },

  getEmployeeCommandCenterData: async (): Promise<EmployeeCommandCenter> => {
    const [attendanceRecords, leaveRequests, payrollRecords, tasks] = await Promise.all([
      hrService.getMyAttendanceRecords(),
      hrService.getMyLeaveRequests(),
      hrService.getMyPayrollRecords(),
      hrService.getTasks(),
    ]);

    const activeTasks = tasks.filter((task) => task.status !== "done").slice(0, 4);
    const completedTasks = tasks.filter((task) => task.status === "done").length;
    const pendingTasks = tasks.filter((task) => task.status !== "done").length;
    const pendingApprovals = leaveRequests.filter((leave) => leave.status === "pending").length;
    const upcomingLeaves = leaveRequests
      .filter((leave) => new Date(leave.startDate).getTime() >= new Date().setHours(0, 0, 0, 0))
      .sort((left, right) => new Date(left.startDate).valueOf() - new Date(right.startDate).valueOf())
      .slice(0, 3);

    const latestProcessedPayroll = payrollRecords.find((record) => record.status === "processed") ?? null;
    const payrollReference = latestProcessedPayroll ?? payrollRecords[0] ?? null;
    const nextPayrollMonth = payrollReference?.month ?? getNextPayrollCycleLabel(payrollRecords);
    const attendanceStreak = calculateAttendanceStreak(attendanceRecords);

    const focusItems: PriorityItem[] = [
      {
        id: "focus-attendance",
        title: "Attendance streak",
        value: `${attendanceStreak} days`,
        meta: "Keep your daily rhythm clean and consistent.",
        route: "/employee/attendance",
        tone: attendanceStreak >= 5 ? "success" : "info",
      },
      {
        id: "focus-tasks",
        title: "Active workload",
        value: `${pendingTasks} tasks`,
        meta: `${completedTasks} tasks completed in the current queue.`,
        route: "/employee/tasks",
        tone: pendingTasks > 0 ? "warning" : "success",
      },
      {
        id: "focus-leave",
        title: "Leave approvals",
        value: `${pendingApprovals} pending`,
        meta: upcomingLeaves[0]
          ? `Next leave starts ${upcomingLeaves[0].startDate}.`
          : "No upcoming leave dates on the calendar.",
        route: "/employee/leave",
        tone: pendingApprovals > 0 ? "warning" : "info",
      },
      {
        id: "focus-payroll",
        title: "Payroll visibility",
        value: nextPayrollMonth ?? "No cycle yet",
        meta: payrollReference
          ? `Latest net pay ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(payrollReference.netPay)}.`
          : "Your latest payroll record will land here automatically.",
        route: "/employee/payroll",
        tone: payrollReference?.status === "processed" ? "success" : payrollReference ? "warning" : "info",
      },
    ];

    return {
      attendanceStreak,
      pendingTasks,
      completedTasks,
      pendingApprovals,
      nextPayrollMonth,
      activeTasks,
      upcomingLeaves,
      focusItems,
    };
  },

  markMyAttendance: async (mode: AttendanceCheckInMode): Promise<AttendanceRecord> => {
    const client = assertSupabase();
    const employee = await hrService.getCurrentEmployee();
    const now = new Date();
    const today = getLocalDateKey(now);
    const currentTime = getLocalTimeLabel(now);
    const currentTimestamp = now.toISOString();
    const todayRecord = await hrService.getMyTodayAttendance();

    if (todayRecord) {
      if (todayRecord.checkOut !== "--") {
        return todayRecord;
      }

      const nextStatus = resolveAttendanceStatus(mode, now, employee);
      const { data, error } = await client
        .from("attendance_records")
        .update({
          status: nextStatus,
          check_in: todayRecord.checkIn === "--" ? currentTime : todayRecord.checkIn,
          check_in_at: todayRecord.checkIn === "--" ? currentTimestamp : todayRecord.checkInAt ?? currentTimestamp,
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
      status: resolveAttendanceStatus(mode, now, employee),
      check_in_at: currentTimestamp,
      check_out_at: null,
      break_minutes: 0,
      time_on_system_minutes: 0,
      break_summary: null,
    };

    const { data, error } = await client.from("attendance_records").insert(row).select("*").single();

    if (error && isDuplicateError(error)) {
      const { data: existing, error: fetchError } = await client
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("date", today)
        .maybeSingle();

      throwIfError(fetchError, "attendance check-in conflict fetch");

      if (existing) {
        return toAttendanceRecord(existing as AttendanceRow);
      }
    }

    throwIfError(error, "attendance check-in create");
    return toAttendanceRecord(data as AttendanceRow);
  },

  updateMyAttendanceProgress: async (payload: {
    breakMinutes?: number;
    breakSummary?: AttendanceRecord["breakSummary"];
    timeOnSystemMinutes?: number;
  }): Promise<AttendanceRecord | null> => {
    const client = assertSupabase();
    const todayRecord = await hrService.getMyTodayAttendance();

    if (!todayRecord) {
      return null;
    }

    if (todayRecord.checkOut !== "--") {
      return todayRecord;
    }

    const breakMinutes = Math.max(0, Math.round(payload.breakMinutes ?? todayRecord.breakMinutes ?? 0));
    const timeOnSystemMinutes = Math.max(
      0,
      Math.round(payload.timeOnSystemMinutes ?? todayRecord.timeOnSystemMinutes ?? 0),
    );

    const { data, error } = await client
      .from("attendance_records")
      .update({
        break_minutes: breakMinutes,
        break_summary: payload.breakSummary ?? todayRecord.breakSummary ?? null,
        time_on_system_minutes: timeOnSystemMinutes,
      })
      .eq("id", todayRecord.id)
      .select("*")
      .single();

    throwIfError(error, "attendance progress update");
    return toAttendanceRecord(data as AttendanceRow);
  },

  markMyCheckOut: async (
    payload?: {
      breakMinutes?: number;
      breakSummary?: AttendanceRecord["breakSummary"];
      timeOnSystemMinutes?: number;
    },
  ): Promise<AttendanceRecord> => {
    const client = assertSupabase();
    const todayRecord = await hrService.getMyTodayAttendance();

    if (!todayRecord) {
      throw new Error("Check in first before marking check out.");
    }

    if (todayRecord.checkOut !== "--") {
      return todayRecord;
    }

    const breakMinutes = Math.max(0, Math.round(payload?.breakMinutes ?? todayRecord.breakMinutes ?? 0));
    const timeOnSystemMinutes = Math.max(
      0,
      Math.round(payload?.timeOnSystemMinutes ?? todayRecord.timeOnSystemMinutes ?? 0),
    );
    const { data, error } = await client
      .from("attendance_records")
      .update({
        check_out: getLocalTimeLabel(),
        check_out_at: new Date().toISOString(),
        break_minutes: breakMinutes,
        break_summary: payload?.breakSummary ?? todayRecord.breakSummary ?? null,
        time_on_system_minutes: timeOnSystemMinutes,
      })
      .eq("id", todayRecord.id)
      .select("*")
      .single();

    throwIfError(error, "attendance check-out update");
    return toAttendanceRecord(data as AttendanceRow);
  },
};
