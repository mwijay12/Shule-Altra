'use client';

/**
 * @fileOverview Navigation model for the aurora admin shell.
 */

import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  ClipboardCheck,
  GraduationCap,
  Banknote,
  UtensilsCrossed,
  PackageSearch,
  CalendarDays,
  Bus,
  BedDouble,
  FileBarChart2,
  Settings2,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  module: string;
  hint?: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { title: 'Command deck', url: '/dashboard', icon: LayoutDashboard, module: 'dashboard', hint: 'Live overview' },
      { title: 'Analytics', url: '/dashboard/analytics', icon: ChartNoAxesCombined, module: 'analytics', hint: 'Trends & forecasts' },
    ],
  },
  {
    label: 'Academic operations',
    items: [
      { title: 'Students', url: '/dashboard/students', icon: Users, module: 'students', hint: 'Enrolment & records' },
      { title: 'Attendance', url: '/dashboard/attendance', icon: ClipboardCheck, module: 'attendance', hint: 'Presence register' },
      { title: 'Academics', url: '/dashboard/academics', icon: GraduationCap, module: 'academics', hint: 'Scores & grading' },
      { title: 'Timetable', url: '/dashboard/timetable', icon: CalendarDays, module: 'timetable', hint: 'Period planner' },
    ],
  },
  {
    label: 'Revenue & resources',
    items: [
      { title: 'Finance', url: '/dashboard/finance', icon: Banknote, module: 'finance', hint: 'Fees & reconciliation' },
      { title: 'Canteen', url: '/dashboard/canteen', icon: UtensilsCrossed, module: 'canteen', hint: 'Cards & baskets' },
      { title: 'Inventory', url: '/dashboard/assets', icon: PackageSearch, module: 'assets', hint: 'Assets & stock' },
    ],
  },
  {
    label: 'Campus logistics',
    items: [
      { title: 'Transport', url: '/dashboard/transport', icon: Bus, module: 'transport', hint: 'Routes & fleet' },
      { title: 'Hostel', url: '/dashboard/hostel', icon: BedDouble, module: 'hostel', hint: 'Boarding nodes' },
    ],
  },
  {
    label: 'Intelligence & system',
    items: [
      { title: 'Reports', url: '/dashboard/reports', icon: FileBarChart2, module: 'reports', hint: 'PDF & printable output' },
      { title: 'Settings', url: '/dashboard/settings', icon: Settings2, module: 'settings', hint: 'Institution profile' },
      { title: 'Help', url: '/dashboard/help', icon: LifeBuoy, module: 'help', hint: 'Support desk' },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
