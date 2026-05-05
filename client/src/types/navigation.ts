import type { LucideIcon } from "lucide-react";

export type NavGroup = "Overview" | "People" | "Operations" | "Finance" | "Configuration";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  footerOnly?: boolean;
  group?: NavGroup;
}
