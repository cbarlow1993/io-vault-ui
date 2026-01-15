import type { LucideIcon } from 'lucide-react';

export type ModuleId = 'treasury' | 'compliance' | 'global';

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  testId: string;
  children?: Omit<NavItem, 'children'>[];
};

export type ModuleConfig = {
  id: ModuleId;
  name: string;
  icon: LucideIcon;
  accent: 'blue' | 'emerald' | 'violet';
  navItems: NavItem[];
  defaultPath: string;
  requiresWorkspace: boolean;
};

export type ModuleAccess = {
  hasAccess: boolean;
  reason?: 'not_licensed' | 'no_role';
};
