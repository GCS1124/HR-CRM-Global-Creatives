import {
  ClipboardList,
  ClipboardCheck,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Settings,
  User,
  UserCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRoute } from "./components/RoleRoute";
import { useAuthSession } from "./hooks/useAuthSession";
import { AppLayout } from "./layouts/AppLayout";
import type { UserRole } from "./types/auth";
import type { NavItem } from "./types/navigation";

// Lazy-loaded pages
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage").then(m => ({ default: m.EmployeesPage })));
const RecruitmentPage = lazy(() => import("./pages/RecruitmentPage").then(m => ({ default: m.RecruitmentPage })));
const RequestsPage = lazy(() => import("./pages/RequestsPage").then(m => ({ default: m.RequestsPage })));
const AttendancePage = lazy(() => import("./pages/AttendancePage").then(m => ({ default: m.AttendancePage })));
const TasksPage = lazy(() => import("./pages/TasksPage").then(m => ({ default: m.TasksPage })));
const LeavePage = lazy(() => import("./pages/LeavePage").then(m => ({ default: m.LeavePage })));
const PayrollPage = lazy(() => import("./pages/PayrollPage").then(m => ({ default: m.PayrollPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const EmployeeDashboardPage = lazy(() => import("./pages/EmployeeDashboardPage").then(m => ({ default: m.EmployeeDashboardPage })));
const EmployeeAttendancePage = lazy(() => import("./pages/EmployeeAttendancePage").then(m => ({ default: m.EmployeeAttendancePage })));
const EmployeeLeavePage = lazy(() => import("./pages/EmployeeLeavePage").then(m => ({ default: m.EmployeeLeavePage })));
const EmployeePayrollPage = lazy(() => import("./pages/EmployeePayrollPage").then(m => ({ default: m.EmployeePayrollPage })));
const EmployeeProfilePage = lazy(() => import("./pages/EmployeeProfilePage").then(m => ({ default: m.EmployeeProfilePage })));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage").then(m => ({ default: m.AuthCallbackPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

const adminNavItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: Gauge, group: "Overview" },
  { label: "Employees", path: "/admin/employees", icon: Users, group: "People" },
  { label: "Attendance", path: "/admin/attendance", icon: UserCheck, group: "Operations" },
  { label: "Requests", path: "/admin/requests", icon: ClipboardCheck, group: "Operations" },
  { label: "Tasks", path: "/admin/tasks", icon: ClipboardList, group: "Operations" },
  { label: "Leave", path: "/admin/leave", icon: CalendarClock, group: "Operations" },
  { label: "Recruitment", path: "/admin/recruitment", icon: UserRound, group: "Operations" },
  { label: "Payroll", path: "/admin/payroll", icon: CircleDollarSign, group: "Finance" },
  { label: "Settings", path: "/admin/settings", icon: Settings, group: "Configuration" },
];

const employeeNavItems: NavItem[] = [
  { label: "Dashboard", path: "/employee", icon: Gauge },
  { label: "My Attendance", path: "/employee/attendance", icon: UserCheck },
  { label: "My Leave", path: "/employee/leave", icon: CalendarClock },
  { label: "Tasks", path: "/employee/tasks", icon: ClipboardList },
  { label: "My Payroll", path: "/employee/payroll", icon: Wallet },
  { label: "My Profile", path: "/employee/profile", icon: User },
  { label: "Attendance", path: "/employee/attendance", icon: UserCheck, footerOnly: true },
  { label: "Leave", path: "/employee/leave", icon: CalendarClock, footerOnly: true },
  { label: "Payroll", path: "/employee/payroll", icon: Wallet, footerOnly: true },
  { label: "Profile", path: "/employee/profile", icon: User, footerOnly: true },
];

function resolveLandingPath(role: UserRole | null): string {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/employee";
  return "/login";
}

function LoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
       <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Node...</p>
       </div>
    </div>
  );
}

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    signUp,
    signInWithGoogle,
    signInWithGitHub,
    isSupabaseConfigured,
    role,
  } = useAuthSession();

  const landingPath = resolveLandingPath(role);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
           <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-brand-700">Initialising HR CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={landingPath} replace />
            ) : (
              <LoginPage
                onLogin={signIn}
                onSignup={signUp}
                onGithubSignIn={signInWithGitHub}
                onGoogleSignIn={signInWithGoogle}
                isSupabaseConfigured={isSupabaseConfigured}
              />
            )
          }
        />

        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} />}>
          <Route index element={<Navigate to={landingPath} replace />} />

          <Route path="/employees" element={<Navigate to="/admin/employees" replace />} />
          <Route path="/attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/leave" element={<Navigate to="/admin/leave" replace />} />
          <Route path="/recruitment" element={<Navigate to="/admin/recruitment" replace />} />
          <Route path="/payroll" element={<Navigate to="/admin/payroll" replace />} />
          <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

          <Route element={<RoleRoute role={role} allowedRoles={["admin"]} fallbackPath={landingPath} />}>
            <Route
              path="/admin"
              element={
              <AppLayout
                  onSignOut={() => void signOut()}
                  items={adminNavItems}
                  workspaceLabel="Admin Command Center"
                  userRole={role ?? "admin"}
                  showQuickLinksFooter={false}
                />
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="recruitment" element={<RecruitmentPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute role={role} allowedRoles={["employee"]} fallbackPath={landingPath} />}>
            <Route
              path="/employee"
              element={
                <AppLayout
                  onSignOut={() => void signOut()}
                  items={employeeNavItems}
                  workspaceLabel="Employee Workspace"
                  userRole={role ?? "employee"}
                />
              }
            >
              <Route index element={<EmployeeDashboardPage />} />
              <Route path="attendance" element={<EmployeeAttendancePage />} />
              <Route path="leave" element={<EmployeeLeavePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="payroll" element={<EmployeePayrollPage />} />
              <Route path="profile" element={<EmployeeProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? landingPath : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}
