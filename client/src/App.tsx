import {
  ClipboardList,
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
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRoute } from "./components/RoleRoute";
import { useAuthSession } from "./hooks/useAuthSession";
import { AppLayout } from "./layouts/AppLayout";
import { AttendancePage } from "./pages/AttendancePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeeAttendancePage } from "./pages/EmployeeAttendancePage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { EmployeeLeavePage } from "./pages/EmployeeLeavePage";
import { EmployeePayrollPage } from "./pages/EmployeePayrollPage";
import { EmployeeProfilePage } from "./pages/EmployeeProfilePage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { LeavePage } from "./pages/LeavePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PayrollPage } from "./pages/PayrollPage";
import { RecruitmentPage } from "./pages/RecruitmentPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";
import type { UserRole } from "./types/auth";
import type { NavItem } from "./types/navigation";

const adminNavItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: Gauge },
  { label: "Employees", path: "/admin/employees", icon: Users },
  { label: "Attendance", path: "/admin/attendance", icon: UserCheck },
  { label: "Tasks", path: "/admin/tasks", icon: ClipboardList },
  { label: "Leave", path: "/admin/leave", icon: CalendarClock },
  { label: "Recruitment", path: "/admin/recruitment", icon: UserRound },
  { label: "Payroll", path: "/admin/payroll", icon: CircleDollarSign },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

const employeeNavItems: NavItem[] = [
  { label: "Dashboard", path: "/employee", icon: Gauge },
  { label: "My Attendance", path: "/employee/attendance", icon: UserCheck },
  { label: "My Leave", path: "/employee/leave", icon: CalendarClock },
  { label: "Tasks", path: "/employee/tasks", icon: ClipboardList },
  { label: "My Payroll", path: "/employee/payroll", icon: Wallet },
  { label: "My Profile", path: "/employee/profile", icon: User },
];

function resolveLandingPath(role: UserRole | null): string {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "employee") {
    return "/employee";
  }

  return "/login";
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
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700">
          Initializing secure session...
        </div>
      </div>
    );
  }

  return (
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
              />
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
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
  );
}
