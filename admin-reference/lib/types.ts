import { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: "default" | "success" | "warning" | "info";
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export interface StatCardData {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  change?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  pillBadge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "neutral" | "brand";
  };
  subtitle?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue: string;
}

export interface FunnelRowData {
  id: string;
  label: string;
  count: number;
  formattedCount: string;
  percentage: number;
  colorHex?: string;
  statusVariant?: "primary" | "success" | "warning" | "danger";
}

export interface KeyMetricData {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  tag?: string;
}

export interface PerformanceTrendPoint {
  date: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  durationSec: number;
}

export interface CallDistributionPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
}
