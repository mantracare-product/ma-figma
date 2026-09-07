import {
  ShoppingCart,
  CreditCard,
  PhoneCall,
  Coins,
  Cpu,
  FolderTree,
  Briefcase,
  LayoutTemplate,
  CheckSquare,
  FileCode,
  SlidersHorizontal,
  ShieldCheck,
  Building2,
  BarChart3,
  Network,
  Users,
  ScrollText,
  Megaphone,
} from "lucide-react";
import { NavGroup, NavItem } from "./types";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "orders",
        label: "Orders",
        href: "/orders",
        icon: ShoppingCart,
      },
      {
        id: "subscriptions",
        label: "Subscriptions",
        href: "/subscriptions",
        icon: CreditCard,
      },
      {
        id: "call-logs",
        label: "Calls logs",
        href: "/call-logs",
        icon: PhoneCall,
      },
      {
        id: "credits",
        label: "Credits/ transactions",
        href: "/credits",
        icon: Coins,
      },
      {
        id: "usages",
        label: "Usages (LiveKit / Dogra, Cartesia)",
        href: "/usages",
        icon: Cpu,
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      {
        id: "industry-category",
        label: "Industry Category",
        href: "/industry-category",
        icon: FolderTree,
      },
      {
        id: "industry",
        label: "Industry",
        href: "/industry-services",
        icon: Briefcase,
      },
      {
        id: "process-templates",
        label: "Process templates",
        href: "/industry-templates",
        icon: LayoutTemplate,
      },
      {
        id: "forms",
        label: "Forms",
        href: "/forms",
        icon: CheckSquare,
      },
      {
        id: "document-templates",
        label: "Document Templates",
        href: "/document-templates",
        icon: FileCode,
      },
      {
        id: "custom-fields",
        label: "Custom Fields",
        href: "/custom-fields",
        icon: SlidersHorizontal,
      },
      {
        id: "roles-permissions",
        label: "Roles & Permissions",
        href: "/roles-permissions",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "corporate",
    label: "Corporate",
    items: [
      {
        id: "organizations",
        label: "Organizations",
        href: "/organizations",
        icon: Building2,
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        id: "plans",
        label: "Plans",
        href: "/plans",
        icon: CreditCard,
      },
      {
        id: "integrations",
        label: "Integration",
        href: "/integrations",
        icon: Network,
      },
      {
        id: "user-management",
        label: "User Management",
        href: "/user-management",
        icon: Users,
      },
      {
        id: "logs",
        label: "Logs",
        href: "/system-logs",
        icon: ScrollText,
      },
      {
        id: "campaigns",
        label: "Campaigns",
        href: "/campaigns",
        icon: Megaphone,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
