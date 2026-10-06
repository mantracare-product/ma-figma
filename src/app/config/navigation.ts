import {
  LayoutDashboard,
  Users,
  Calendar,
  Phone,
  MessageCircle,
  Stethoscope,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Database,
  Receipt,
  ShieldCheck,
  Package,
  BarChart3,
  Gift,
  Settings,
  Building2,
  UserCog,
  CreditCard,
  Volume2,
  Hash,
  Layers,
  Link as LinkIcon,
  ScrollText,
  Lock,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export type Role = "SystemAdmin" | "Admin" | "Manager" | "Agent" | "Reception" | string;

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;            // omit if the item only expands children
  children?: NavItem[];     // one level of nesting max
  roles?: Role[];           // omit = visible to all roles
  badge?: string;
  isAction?: boolean;       // for Sign Out / custom actions
  actionType?: "signout" | "profile";
}

export interface NavGroup {
  id: string;
  label?: string;           // omit for the ungrouped top item
  items: NavItem[];
  pinnedBottom?: boolean;
}

export const navigationConfig: NavGroup[] = [
  // Top (no group header)
  {
    id: "top",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        path: "/",
      },
    ],
  },

  // WORKSPACE (open by default)
  {
    id: "workspace",
    label: "WORKSPACE",
    items: [
      {
        id: "clients",
        label: "Clients",
        icon: Users,
        path: "/clients",
      },
      {
        id: "call-logs",
        label: "Call Logs",
        icon: Phone,
        path: "/call-logs",
      },
      {
        id: "chats",
        label: "Chats",
        icon: MessageCircle,
        path: "/chats",
      },
      {
        id: "processes",
        label: "Process",
        icon: RefreshCw,
        path: "/deals",
      },
      {
        id: "appointments",
        label: "Appointments",
        icon: Calendar,
        path: "/appointments",
      },
      {
        id: "scribe",
        label: "AI Scribe",
        icon: Stethoscope,
        path: "/scribe",
      },
    ],
  },

  // AUTOMATIONS
  {
    id: "automation",
    label: "AUTOMATIONS",
    items: [
      {
        id: "workflows",
        label: "Workflows",
        icon: SlidersHorizontal,
        path: "/process",
      },
      {
        id: "knowledge-base",
        label: "Knowledge Base",
        icon: Database,
        path: "/knowledge-base",
      },
      {
        id: "web-forms",
        label: "Webforms",
        icon: FileText,
        path: "/web-forms",
      },
    ],
  },

  // REVENUE & INSIGHTS
  {
    id: "billing-insights",
    label: "REVENUE & INSIGHTS",
    items: [
      {
        id: "product-services",
        label: "Product & Services",
        icon: Package,
        path: "/services",
      },
      {
        id: "invoices",
        label: "Invoice",
        icon: Receipt,
        path: "/invoices",
      },
      {
        id: "insurance-claims",
        label: "Insurance & Claims",
        icon: ShieldCheck,
        path: "/claims",
      },
      {
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        path: "/reports",
      },
    ],
  },

  // SETTINGS (in main body, not pinned at bottom)
  {
    id: "settings-group",
    label: "SETTINGS",
    items: [
      {
        id: "settings-org",
        label: "Organization",
        icon: Building2,
        path: "/settings/organization",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-team",
        label: "Team",
        icon: UserCog,
        path: "/settings/team",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-billing",
        label: "Billing",
        icon: CreditCard,
        path: "/settings/billing",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-voices",
        label: "AI Voices / Models",
        icon: Volume2,
        path: "/settings/voices",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-numbers",
        label: "Numbers",
        icon: Hash,
        path: "/settings/numbers",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-sections",
        label: "Sections / Fields",
        icon: Layers,
        path: "/settings/sections-fields",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-integrations",
        label: "Integrations",
        icon: LinkIcon,
        path: "/settings/integrations",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-audit",
        label: "Audit Logs",
        icon: ScrollText,
        path: "/settings/audit-logs",
        roles: ["SystemAdmin"],
      },
      {
        id: "settings-security",
        label: "Security",
        icon: Lock,
        path: "/settings/security",
        roles: ["SystemAdmin"],
      },
    ],
  },

  // Pinned bottom (Profile / Sign Out only)
  {
    id: "bottom",
    pinnedBottom: true,
    items: [
      {
        id: "sign-out",
        label: "Profile / Sign Out",
        icon: LogOut,
        isAction: true,
        actionType: "signout",
      },
    ],
  },
];

/**
 * Filter navigation configuration based on the user's role
 */
export function getFilteredNavigation(userRole: Role = "SystemAdmin"): NavGroup[] {
  return navigationConfig
    .map((group) => {
      const visibleItems = group.items
        .filter((item) => {
          if (!item.roles || item.roles.length === 0) return true;
          return item.roles.includes(userRole);
        })
        .map((item) => {
          if (!item.children) return item;
          const visibleChildren = item.children.filter((child) => {
            if (!child.roles || child.roles.length === 0) return true;
            return child.roles.includes(userRole);
          });
          return {
            ...item,
            children: visibleChildren,
          };
        });

      return {
        ...group,
        items: visibleItems,
      };
    })
    .filter((group) => group.items.length > 0);
}
