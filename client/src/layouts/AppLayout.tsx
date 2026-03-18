import { Outlet } from "react-router-dom";
import { AppMobileNav } from "../components/AppMobileNav";
import { AppSidebar } from "../components/AppSidebar";
import { AppTopbar } from "../components/AppTopbar";
import type { NavItem } from "../types/navigation";

interface AppLayoutProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
}

export function AppLayout({ onSignOut, items, workspaceLabel }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <AppSidebar items={items} workspaceLabel={workspaceLabel} />
        <div className="min-w-0 flex-1">
          <AppTopbar onSignOut={onSignOut} items={items} workspaceLabel={workspaceLabel} />
          <main className="px-4 py-5 pb-24 md:px-6 md:py-6 lg:px-8 lg:pb-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AppMobileNav items={items} />
    </div>
  );
}
