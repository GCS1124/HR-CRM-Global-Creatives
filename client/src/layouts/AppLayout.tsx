import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMobileNav } from "../components/AppMobileNav";
import { AppSidebar } from "../components/AppSidebar";
import { AppTopbar } from "../components/AppTopbar";
import { EmployeePrivateDetailsForm } from "../components/EmployeePrivateDetailsForm";
import { QuickLinksFooter } from "../components/QuickLinksFooter";
import { WorkspaceCommandPalette } from "../components/WorkspaceCommandPalette";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { Employee, EmployeeProfileDetailsPayload, Notification } from "../types/hr";
import type { UserRole } from "../types/auth";
import type { NavItem } from "../types/navigation";
import {
  emptyEmployeeProfileDetails,
  hasCompleteEmployeeProfileDetails,
  toEmployeeProfileDetailsPayload,
} from "../utils/employeeProfile";

interface AppLayoutProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
  userRole: UserRole;
  showQuickLinksFooter?: boolean;
}

export function AppLayout({
  onSignOut,
  items,
  workspaceLabel,
  userRole,
  showQuickLinksFooter = true,
}: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [profilePromptDraft, setProfilePromptDraft] =
    useState<EmployeeProfileDetailsPayload>(emptyEmployeeProfileDetails);
  const [profilePromptLoading, setProfilePromptLoading] = useState(false);
  const [profilePromptError, setProfilePromptError] = useState<string | null>(null);
  const [profilePromptMessage, setProfilePromptMessage] = useState<string | null>(null);
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);
  const previousPathRef = useRef(location.pathname);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );
  const requiresProfileCompletion =
    userRole === "employee" &&
    !profilePromptLoading &&
    currentEmployee !== null &&
    !hasCompleteEmployeeProfileDetails(currentEmployee) &&
    !profilePromptDismissed;

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const data = await hrService.getNotifications(userRole);
      setNotifications(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load notifications.";
      setNotificationsError(message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [userRole]);


  const loadCurrentEmployee = useCallback(async () => {
    if (userRole !== "employee") {
      setCurrentEmployee(null);
      setProfilePromptDraft(emptyEmployeeProfileDetails);
      return;
    }

    setProfilePromptLoading(true);
    setProfilePromptError(null);

    try {
      const employee = await hrService.getCurrentEmployee();
      setCurrentEmployee(employee);
      setProfilePromptDraft(toEmployeeProfileDetailsPayload(employee));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load employee profile.";
      if (!isNewUserEmployeeSetupError(message)) {
        setProfilePromptError(message);
      }
      setCurrentEmployee(null);
    } finally {
      setProfilePromptLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      if (showNotifications) {
        setShowNotifications(false);
      }
      setNotificationsError(null);
      setNotificationsLoading(false);
    }
  }, [location.pathname, showNotifications]);

  useEffect(() => {
    void loadCurrentEmployee();
  }, [loadCurrentEmployee]);

  useEffect(() => {
    setProfilePromptDismissed(false);
  }, [userRole, currentEmployee?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenNotifications = useCallback(() => {
    setShowNotifications(true);
    void loadNotifications();
  }, [loadNotifications]);

  const handleToggleNotifications = () => {
    setShowNotifications((previous) => {
      const next = !previous;
      if (next) {
        void loadNotifications();
      }
      return next;
    });
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const shortcutItems = useMemo(
    () => {
      const navItems = items.filter((item) => !item.footerOnly);
      return [
        {
          id: "alerts",
          perform: () => handleOpenNotifications(),
        },
        ...navItems.map((item) => ({
          id: item.path,
          perform: () => {
            navigate(item.path);
          },
        })),
      ];
    },
    [handleOpenNotifications, items, navigate],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest("input, textarea, select")) {
        return;
      }

      if (!/^[1-9]$/.test(event.key)) {
        return;
      }

      const index = Number(event.key) - 1;
      const action = shortcutItems[index];
      if (!action) {
        return;
      }

      event.preventDefault();
      action.perform();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [shortcutItems]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      await hrService.markNotificationsRead(userRole);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to mark notifications read.";
      setNotificationsError(message);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleProfileDraftChange = (field: keyof EmployeeProfileDetailsPayload, value: string) => {
    setProfilePromptMessage(null);
    setProfilePromptError(null);
    setProfilePromptDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProfilePromptSave = async () => {
    setProfilePromptLoading(true);
    setProfilePromptError(null);
    setProfilePromptMessage(null);

    try {
      const employee = await hrService.upsertMyProfileDetails(profilePromptDraft);
      setCurrentEmployee(employee);
      setProfilePromptDraft(toEmployeeProfileDetailsPayload(employee));
      setProfilePromptMessage("Profile details saved.");
    } catch (error) {
      setProfilePromptError(error instanceof Error ? error.message : "Unable to save profile details.");
    } finally {
      setProfilePromptLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      void hrService.autoCheckoutStaleSessions();
    }
  }, [userRole]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <AppSidebar items={items} workspaceLabel={workspaceLabel} />
        <div className="min-w-0 flex-1">
            <AppTopbar
              onSignOut={onSignOut}
              items={items}
              workspaceLabel={workspaceLabel}
              userRole={userRole}
              onToggleNotifications={handleToggleNotifications}
              onCloseNotifications={handleCloseNotifications}
              notifications={notifications}
              notificationsLoading={notificationsLoading}
              notificationsError={notificationsError}
              onMarkAllRead={handleMarkAllRead}
              unreadNotifications={unreadCount}
              notificationsOpen={showNotifications}
            />
          <main className="px-4 py-5 pb-24 md:px-6 md:py-6 lg:px-8 lg:pb-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <Outlet />
              {showQuickLinksFooter ? <QuickLinksFooter items={items} /> : null}
            </div>
          </main>
        </div>
      </div>
      <AppMobileNav items={items} />
      <WorkspaceCommandPalette
        key={commandPaletteOpen ? "command-palette-open" : "command-palette-closed"}
        isOpen={commandPaletteOpen}
        items={items}
        workspaceLabel={workspaceLabel}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenNotifications={handleOpenNotifications}
      />
      {requiresProfileCompletion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[32px] border border-brand-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-700">
                  First Login Setup
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-brand-950">
                  Complete your payroll and compliance details
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Add PAN, address, mobile, bank name, and account number before continuing. These
                  details are used in your employee profile and salary slips.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfilePromptDismissed(true)}
                className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-brand-700 transition hover:bg-white/90"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <EmployeePrivateDetailsForm
                value={profilePromptDraft}
                onChange={handleProfileDraftChange}
                onSubmit={handleProfilePromptSave}
                submitting={profilePromptLoading}
                submitLabel="Save and continue"
                error={profilePromptError}
                successMessage={profilePromptMessage}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
