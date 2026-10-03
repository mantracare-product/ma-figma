import React, { createContext, useContext, useState, useEffect } from "react";
import { useOrganization } from "./OrganizationContext";

export interface NavItemConfig {
  id: string;
  label: string;
  iconName: string;
  path: string;
  visible: boolean;
  isFeatured?: boolean;
  badge?: string;
}

export interface NavSectionConfig {
  id: string;
  title: string;
  defaultExpanded: boolean;
  items: NavItemConfig[];
}

export interface SidebarMenuConfig {
  sections: NavSectionConfig[];
  version: number;
  defaultStartPage?: string;
}

export const DEFAULT_SIDEBAR_CONFIG: SidebarMenuConfig = {
  version: 3,
  defaultStartPage: "/",
  sections: [
    {
      id: "workspace",
      title: "WORKSPACE",
      defaultExpanded: true,
      items: [
        { id: "overview", label: "Overview", iconName: "LayoutDashboard", path: "/", visible: true, isFeatured: true },
        { id: "clients", label: "Clients", iconName: "Users", path: "/clients", visible: true, isFeatured: true },
        { id: "call-logs", label: "Call Logs", iconName: "Phone", path: "/call-logs", visible: true, isFeatured: true },
        { id: "chats", label: "Chats", iconName: "MessageCircle", path: "/chats", visible: true, isFeatured: true },
        { id: "processes", label: "Process", iconName: "RefreshCw", path: "/deals", visible: true, isFeatured: true },
        { id: "scribe", label: "AI Scribe", iconName: "Stethoscope", path: "/scribe", visible: true, isFeatured: true },
        { id: "appointments", label: "Appointments", iconName: "Calendar", path: "/appointments", visible: true, isFeatured: true },
      ],
    },
    {
      id: "automation",
      title: "AUTOMATIONS",
      defaultExpanded: false,
      items: [
        { id: "workflows", label: "Workflows", iconName: "SlidersHorizontal", path: "/process", visible: true },
        { id: "knowledge-base", label: "Knowledge Base", iconName: "Database", path: "/knowledge-base", visible: true },
        { id: "web-forms", label: "Webforms", iconName: "FileText", path: "/web-forms", visible: true },
      ],
    },
    {
      id: "billing",
      title: "BILLING & INSIGHTS",
      defaultExpanded: false,
      items: [
        { id: "product-services", label: "Product & Services", iconName: "Package", path: "/services", visible: true },
        { id: "invoices", label: "Invoice", iconName: "Receipt", path: "/invoices", visible: true },
        { id: "insurance-claims", label: "Insurance & Claims", iconName: "ShieldCheck", path: "/claims", visible: true },
        { id: "reports", label: "Reports", iconName: "BarChart3", path: "/reports", visible: true },
      ],
    },
    {
      id: "settings",
      title: "SETTINGS",
      defaultExpanded: false,
      items: [
        { id: "settings-org", label: "Organization", iconName: "Building2", path: "/settings/organization", visible: true },
        { id: "settings-team", label: "Team", iconName: "UserCog", path: "/settings/team", visible: true },
        { id: "settings-billing", label: "Billing", iconName: "CreditCard", path: "/settings/billing", visible: true },
        { id: "settings-voices", label: "AI Voices / Models", iconName: "Volume2", path: "/settings/voices", visible: true },
        { id: "settings-sections", label: "Sections / Fields", iconName: "Layers", path: "/settings/sections-fields", visible: true },
        { id: "settings-integrations", label: "Integrations", iconName: "Link", path: "/settings/integrations", visible: true },
        { id: "settings-audit", label: "Audit Logs", iconName: "ScrollText", path: "/settings/audit-logs", visible: true },
        { id: "settings-security", label: "Security", iconName: "Lock", path: "/settings/security", visible: true },
      ],
    },
  ],
};

interface SidebarMenuContextType {
  config: SidebarMenuConfig;
  defaultStartPage: string;
  setDefaultStartPage: (path: string) => void;
  updateConfig: (newConfig: SidebarMenuConfig) => void;
  resetToDefault: () => void;
  isConfiguring: boolean;
  setIsConfiguring: (configuring: boolean) => void;
  toggleItemVisibility: (sectionId: string, itemId: string) => void;
  toggleItemFeatured: (sectionId: string, itemId: string) => void;
  moveItem: (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => void;
  reorderSectionItems: (sectionId: string, fromIndex: number, toIndex: number) => void;
  toggleSectionDefaultExpanded: (sectionId: string) => void;
}

const SidebarMenuContext = createContext<SidebarMenuContextType | undefined>(undefined);

function loadAndMigrateConfig(storageKey: string): SidebarMenuConfig {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        if (!parsed.version || parsed.version < 3) {
          // Migrate: ensure workspace items default to isFeatured: true, and remove legacy settings-numbers item
          const migratedSections = parsed.sections.map((sec: NavSectionConfig) => {
            if (sec.id === "workspace") {
              return {
                ...sec,
                items: sec.items.map((it: NavItemConfig) => ({
                  ...it,
                  isFeatured: it.isFeatured !== undefined ? it.isFeatured : true,
                })),
              };
            }
            if (sec.id === "settings") {
              return {
                ...sec,
                items: sec.items.filter((it: NavItemConfig) => it.id !== "settings-numbers"),
              };
            }
            return sec;
          });
          const migrated = { ...parsed, version: 3, sections: migratedSections };
          localStorage.setItem(storageKey, JSON.stringify(migrated));
          return migrated;
        }
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_SIDEBAR_CONFIG;
}

export function SidebarMenuProvider({ children }: { children: React.ReactNode }) {
  const { activeOrganization } = useOrganization();
  const storageKey = `mantra_sidebar_config_${activeOrganization?.id || "default"}`;

  const [config, setConfig] = useState<SidebarMenuConfig>(() => loadAndMigrateConfig(storageKey));

  const [isConfiguring, setIsConfiguring] = useState(false);

  // Sync with localStorage when active org changes
  useEffect(() => {
    setConfig(loadAndMigrateConfig(storageKey));
  }, [storageKey]);

  const saveConfig = (newConfig: SidebarMenuConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
    } catch (e) {
      console.error("Failed to persist sidebar config", e);
    }
  };

  const updateConfig = (newConfig: SidebarMenuConfig) => {
    saveConfig(newConfig);
  };

  const resetToDefault = () => {
    saveConfig(DEFAULT_SIDEBAR_CONFIG);
  };

  const toggleItemVisibility = (sectionId: string, itemId: string) => {
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, visible: !item.visible };
          }),
        };
      }),
    };
    saveConfig(updated);
  };

  const toggleItemFeatured = (sectionId: string, itemId: string) => {
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, isFeatured: !item.isFeatured };
          }),
        };
      }),
    };
    saveConfig(updated);
  };

  const reorderSectionItems = (sectionId: string, fromIndex: number, toIndex: number) => {
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const newItems = [...sec.items];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);
        return { ...sec, items: newItems };
      }),
    };
    saveConfig(updated);
  };

  const moveItem = (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => {
    if (fromSectionId === toSectionId) {
      reorderSectionItems(fromSectionId, fromIndex, toIndex);
      return;
    }

    let movedItem: NavItemConfig | null = null;
    const sectionsAfterRemove = config.sections.map((sec) => {
      if (sec.id !== fromSectionId) return sec;
      const newItems = [...sec.items];
      [movedItem] = newItems.splice(fromIndex, 1);
      return { ...sec, items: newItems };
    });

    if (!movedItem) return;

    const finalSections = sectionsAfterRemove.map((sec) => {
      if (sec.id !== toSectionId) return sec;
      const newItems = [...sec.items];
      newItems.splice(toIndex, 0, movedItem!);
      return { ...sec, items: newItems };
    });

    saveConfig({ ...config, sections: finalSections });
  };

  const setDefaultStartPage = (path: string) => {
    const updated = {
      ...config,
      defaultStartPage: path,
      sections: config.sections.map((sec) => ({
        ...sec,
        items: sec.items.map((item) => {
          if (item.path === path) {
            return { ...item, visible: true, isFeatured: true };
          }
          return item;
        }),
      })),
    };
    saveConfig(updated);
  };

  const toggleSectionDefaultExpanded = (sectionId: string) => {
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, defaultExpanded: !sec.defaultExpanded };
      }),
    };
    saveConfig(updated);
  };

  return (
    <SidebarMenuContext.Provider
      value={{
        config,
        defaultStartPage: config.defaultStartPage || "/",
        setDefaultStartPage,
        updateConfig,
        resetToDefault,
        isConfiguring,
        setIsConfiguring,
        toggleItemVisibility,
        toggleItemFeatured,
        moveItem,
        reorderSectionItems,
        toggleSectionDefaultExpanded,
      }}
    >
      {children}
    </SidebarMenuContext.Provider>
  );
}

export function useSidebarMenu() {
  const context = useContext(SidebarMenuContext);
  if (!context) {
    throw new Error("useSidebarMenu must be used within a SidebarMenuProvider");
  }
  return context;
}
