import React, { createContext, useContext, useState, useEffect } from "react";
import { useOrganization, Organization } from "./OrganizationContext";
import {
  AdminSidebarTemplate,
  resolveSidebarTemplateForOrg,
  SIDEBAR_TEMPLATES_EVENT,
  SIDEBAR_TEMPLATES_STORAGE_KEY,
} from "../../lib/sidebarTemplateStore";

export interface NavItemConfig {
  id: string;
  label: string;
  iconName: string;
  path: string;
  visible: boolean;
  isFeatured?: boolean;
  badge?: string;
  isWorkflow?: boolean;
  workflowId?: string;
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
  templateId?: string;
  templateName?: string;
  isCustomizedByUser?: boolean;
}

export const DEFAULT_SIDEBAR_CONFIG: SidebarMenuConfig = {
  version: 8,
  defaultStartPage: "/",
  sections: [
    {
      id: "workspace",
      title: "WORKSPACE",
      defaultExpanded: true,
      items: [
        { id: "overview", label: "Overview", iconName: "LayoutDashboard", path: "/", visible: true, isFeatured: true },
        { id: "clients", label: "Contact", iconName: "Users", path: "/clients", visible: true, isFeatured: true },
        { id: "call-logs", label: "Call Logs", iconName: "Phone", path: "/call-logs", visible: true, isFeatured: true },
        { id: "chats", label: "Chats", iconName: "MessageCircle", path: "/chats", visible: true, isFeatured: true },
        { id: "processes", label: "Process", iconName: "RefreshCw", path: "/deals", visible: true, isFeatured: true },
        { id: "tasks", label: "Tasks", iconName: "CheckSquare", path: "/tasks", visible: true, isFeatured: true },
        { id: "appointments", label: "Appointments", iconName: "Calendar", path: "/appointments", visible: true, isFeatured: true },
        { id: "scribe", label: "AI Scribe", iconName: "Stethoscope", path: "/scribe", visible: true, isFeatured: true },
      ],
    },
    {
      id: "billing",
      title: "REVENUE & INSIGHTS",
      defaultExpanded: false,
      items: [
        { id: "product-services", label: "Product & Services", iconName: "Package", path: "/services", visible: true },
        { id: "invoices", label: "Invoice", iconName: "Receipt", path: "/invoices", visible: true },
        { id: "insurance-claims", label: "Insurance & Claims", iconName: "ShieldCheck", path: "/claims", visible: true },
        { id: "reports", label: "Reports", iconName: "BarChart3", path: "/reports", visible: true },
      ],
    },
    {
      id: "automation",
      title: "CUSTOMIZATIONS",
      defaultExpanded: false,
      items: [
        { id: "workflows", label: "Workflows", iconName: "SlidersHorizontal", path: "/process", visible: true },
        { id: "global-automation", label: "Automation", iconName: "Zap", path: "/automation", visible: true },
        { id: "knowledge-base", label: "Knowledge Base", iconName: "Database", path: "/knowledge-base", visible: true },
        { id: "web-forms", label: "Webforms", iconName: "FileText", path: "/web-forms", visible: true },
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
  activeAdminTemplate: AdminSidebarTemplate | null;
  defaultStartPage: string;
  setDefaultStartPage: (path: string) => void;
  updateConfig: (newConfig: SidebarMenuConfig) => void;
  resetToDefault: () => void;
  resetToAdminTemplate: () => void;
  isConfiguring: boolean;
  setIsConfiguring: (configuring: boolean) => void;
  toggleItemVisibility: (sectionId: string, itemId: string) => void;
  toggleItemFeatured: (sectionId: string, itemId: string) => void;
  moveItem: (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => void;
  reorderSectionItems: (sectionId: string, fromIndex: number, toIndex: number) => void;
  toggleSectionDefaultExpanded: (sectionId: string) => void;
  addToWorkspace: (item: { id: string; label: string; iconName: string; path: string }) => void;
  removeFromWorkspace: (pathOrId: string) => void;
  isInWorkspace: (pathOrId: string) => boolean;
}

const globalForSidebar = typeof window !== "undefined" ? (window as any) : (globalThis as any);
const SidebarMenuContext: React.Context<SidebarMenuContextType | undefined> =
  globalForSidebar.__MANTRA_SIDEBAR_MENU_CONTEXT__ ||
  (globalForSidebar.__MANTRA_SIDEBAR_MENU_CONTEXT__ = createContext<SidebarMenuContextType | undefined>(undefined));

function loadAndMigrateConfig(storageKey: string, org?: Organization | null): SidebarMenuConfig {
  const matchedTemplate = resolveSidebarTemplateForOrg(org);

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      // ONLY keep custom layout if the saved layout belongs to the EXACT template matching the current scope
      const isSameTemplate = Boolean(parsed.templateId && parsed.templateId === matchedTemplate.id);

      if (isSameTemplate && parsed.isCustomizedByUser && parsed.sections && Array.isArray(parsed.sections)) {
        if (!parsed.version || parsed.version < 6) {
          // Migrate: ensure workspace items default to isFeatured: true, appointments above scribe, remove legacy settings-numbers item, update billing to REVENUE & INSIGHTS, and automation to CUSTOMIZATIONS
          const migratedSections = parsed.sections.map((sec: NavSectionConfig) => {
            if (sec.id === "billing") {
              return {
                ...sec,
                title: "REVENUE & INSIGHTS",
              };
            }
            if (sec.id === "automation") {
              return {
                ...sec,
                title: "CUSTOMIZATIONS",
              };
            }
            if (sec.id === "workspace") {
              const items = [...sec.items];
              const apptIdx = items.findIndex((it) => it.id === "appointments");
              const scribeIdx = items.findIndex((it) => it.id === "scribe");
              if (apptIdx !== -1 && scribeIdx !== -1 && apptIdx > scribeIdx) {
                const [apptItem] = items.splice(apptIdx, 1);
                const newScribeIdx = items.findIndex((it) => it.id === "scribe");
                items.splice(newScribeIdx, 0, apptItem);
              }
              return {
                ...sec,
                items: items.map((it: NavItemConfig) => ({
                  ...it,
                  label: it.id === "clients" ? "Contact" : it.label,
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
          const migrated = { ...parsed, version: 7, sections: migratedSections };
          localStorage.setItem(storageKey, JSON.stringify(migrated));
          return migrated;
        }

        // Always ensure billing and automation sections have correct titles and items, and billing is above automation
        if (parsed.sections) {
          const sectionOrder = ["workspace", "billing", "automation", "settings"];
          parsed.sections.sort((a: NavSectionConfig, b: NavSectionConfig) => {
            const ai = sectionOrder.indexOf(a.id);
            const bi = sectionOrder.indexOf(b.id);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });
          parsed.sections = parsed.sections.map((sec: NavSectionConfig) => {
            if (sec.id === "workspace") {
              let items = [...sec.items];
              const apptIdx = items.findIndex((it) => it.id === "appointments");
              const scribeIdx = items.findIndex((it) => it.id === "scribe");
              if (apptIdx !== -1 && scribeIdx !== -1 && apptIdx > scribeIdx) {
                const [apptItem] = items.splice(apptIdx, 1);
                const newScribeIdx = items.findIndex((it) => it.id === "scribe");
                items.splice(newScribeIdx, 0, apptItem);
              }
              const hasTasks = items.some((it) => it.id === "tasks");
              if (!hasTasks) {
                const procIdx = items.findIndex((it) => it.id === "processes");
                const taskItem: NavItemConfig = {
                  id: "tasks",
                  label: "Tasks",
                  iconName: "CheckSquare",
                  path: "/tasks",
                  visible: true,
                  isFeatured: true,
                };
                if (procIdx !== -1) {
                  items.splice(procIdx + 1, 0, taskItem);
                } else {
                  items.push(taskItem);
                }
              }
              items = items.map((it) => {
                if (it.id === "clients") return { ...it, label: "Contact" };
                if (it.id === "processes") return { ...it, label: "Process", path: "/deals" };
                return it;
              });
              return { ...sec, items };
            }
            if (sec.id === "billing") return { ...sec, title: "REVENUE & INSIGHTS" };
            if (sec.id === "automation") {
              const hasAuto = sec.items.some((it) => it.id === "global-automation");
              if (!hasAuto) {
                const wfIdx = sec.items.findIndex((it) => it.id === "workflows");
                const newItems = [...sec.items];
                const autoItem: NavItemConfig = {
                  id: "global-automation",
                  label: "Automation",
                  iconName: "Zap",
                  path: "/automation",
                  visible: true,
                };
                if (wfIdx !== -1) {
                  newItems.splice(wfIdx + 1, 0, autoItem);
                } else {
                  newItems.unshift(autoItem);
                }
                return { ...sec, title: "CUSTOMIZATIONS", items: newItems };
              }
              return { ...sec, title: "CUSTOMIZATIONS" };
            }
            return sec;
          });
          try {
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      }
    }
  } catch {}

  // Apply resolved matching Admin Scoped Template for this organization
  const templateSections: NavSectionConfig[] = JSON.parse(JSON.stringify(matchedTemplate.sections));
  const wsSec = templateSections.find((s) => s.id === "workspace");
  if (wsSec && !wsSec.items.some((it) => it.id === "tasks")) {
    const procIdx = wsSec.items.findIndex((it) => it.id === "processes");
    const taskItem: NavItemConfig = {
      id: "tasks",
      label: "Tasks",
      iconName: "CheckSquare",
      path: "/tasks",
      visible: true,
      isFeatured: true,
    };
    if (procIdx !== -1) {
      wsSec.items.splice(procIdx + 1, 0, taskItem);
    } else {
      wsSec.items.push(taskItem);
    }
  }

  const newConfig: SidebarMenuConfig = {
    version: 8,
    defaultStartPage: matchedTemplate.defaultStartPage || "/",
    templateId: matchedTemplate.id,
    templateName: matchedTemplate.name,
    isCustomizedByUser: false,
    sections: templateSections,
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
  } catch {}

  return newConfig;
}

export function SidebarMenuProvider({ children }: { children: React.ReactNode }) {
  const { activeOrganization } = useOrganization();
  const storageKey = `mantra_sidebar_config_${activeOrganization?.id || "default"}`;

  const activeAdminTemplate = React.useMemo(() => {
    return resolveSidebarTemplateForOrg(activeOrganization);
  }, [
    activeOrganization?.id,
    activeOrganization?.industryCategory,
    activeOrganization?.industry,
    activeOrganization?.location,
    activeOrganization?.locations?.join(","),
  ]);

  const [config, setConfig] = useState<SidebarMenuConfig>(() =>
    loadAndMigrateConfig(storageKey, activeOrganization)
  );

  const [isConfiguring, setIsConfiguring] = useState(false);

  // Sync with localStorage when active org or its admin scope changes
  useEffect(() => {
    setConfig(loadAndMigrateConfig(storageKey, activeOrganization));
  }, [
    storageKey,
    activeOrganization?.id,
    activeOrganization?.industryCategory,
    activeOrganization?.industry,
    activeOrganization?.location,
    activeOrganization?.locations?.join(","),
  ]);

  // Sync with admin sidebar template updates and org updates across tabs & local events
  useEffect(() => {
    const handleAdminOrOrgUpdate = () => {
      setConfig(loadAndMigrateConfig(storageKey, activeOrganization));
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === SIDEBAR_TEMPLATES_STORAGE_KEY ||
        e.key === "mantra_organizations_v1" ||
        e.key === "mantra_active_org_id_v1" ||
        (e.key && e.key === storageKey)
      ) {
        handleAdminOrOrgUpdate();
      }
    };

    window.addEventListener(SIDEBAR_TEMPLATES_EVENT, handleAdminOrOrgUpdate);
    window.addEventListener("organizationChanged", handleAdminOrOrgUpdate);
    window.addEventListener("mantra_organization_changed", handleAdminOrOrgUpdate);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(SIDEBAR_TEMPLATES_EVENT, handleAdminOrOrgUpdate);
      window.removeEventListener("organizationChanged", handleAdminOrOrgUpdate);
      window.removeEventListener("mantra_organization_changed", handleAdminOrOrgUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [
    storageKey,
    activeOrganization?.id,
    activeOrganization?.industryCategory,
    activeOrganization?.industry,
    activeOrganization?.location,
    activeOrganization?.locations?.join(","),
  ]);

  const saveConfig = (newConfig: SidebarMenuConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
    } catch (e) {
      console.error("Failed to persist sidebar config", e);
    }
  };

  const updateConfig = (newConfig: SidebarMenuConfig) => {
    saveConfig({ ...newConfig, isCustomizedByUser: true });
  };

  const resetToAdminTemplate = () => {
    const matched = resolveSidebarTemplateForOrg(activeOrganization);
    const resetConfig: SidebarMenuConfig = {
      version: 7,
      defaultStartPage: matched.defaultStartPage || "/",
      templateId: matched.id,
      templateName: matched.name,
      isCustomizedByUser: false,
      sections: JSON.parse(JSON.stringify(matched.sections)),
    };
    saveConfig(resetConfig);
  };

  const resetToDefault = () => {
    resetToAdminTemplate();
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
    const isAlreadyDefault = config.defaultStartPage === path;
    const newDefault = isAlreadyDefault ? "" : path;
    const updated = {
      ...config,
      defaultStartPage: newDefault,
      sections: config.sections.map((sec) => ({
        ...sec,
        items: sec.items.map((item) => {
          if (item.path === path) {
            return {
              ...item,
              visible: true,
              isFeatured: isAlreadyDefault ? false : true,
            };
          }
          return item;
        }),
      })),
    };
    saveConfig(updated);
  };

  const isInWorkspace = (pathOrId: string): boolean => {
    const wsSec = config.sections.find((s) => s.id === "workspace");
    if (!wsSec) return false;
    const cleanTarget = decodeURIComponent(pathOrId).toLowerCase().trim();
    return wsSec.items.some((i) => {
      if (!i.visible) return false;
      const itemId = i.id.toLowerCase();
      const itemPath = decodeURIComponent(i.path).toLowerCase();
      const itemLabel = i.label.toLowerCase();

      if (itemId === cleanTarget) return true;
      if (itemPath === cleanTarget) return true;
      if (!cleanTarget.startsWith("/") && itemLabel === cleanTarget) return true;

      // Match query params if both have them
      if (cleanTarget.includes("?") && itemPath.includes("?")) {
        const [targetBase, targetQuery] = cleanTarget.split("?");
        const [itemBase, itemQuery] = itemPath.split("?");
        if (targetBase === itemBase) {
          const targetParams = new URLSearchParams(targetQuery);
          const itemParams = new URLSearchParams(itemQuery);
          const targetProc = targetParams.get("process") || targetParams.get("processName") || targetParams.get("processId");
          const itemProc = itemParams.get("process") || itemParams.get("processName") || itemParams.get("processId");
          if (targetProc && itemProc && targetProc.toLowerCase() === itemProc.toLowerCase()) return true;
        }
      }

      return false;
    });
  };

  const addToWorkspace = (item: { id: string; label: string; iconName: string; path: string }) => {
    const wsSec = config.sections.find((s) => s.id === "workspace");
    if (!wsSec) return;

    const normPath = decodeURIComponent(item.path).toLowerCase();
    const itemIdLower = item.id.toLowerCase();

    // Check if item already exists in workspace by id, exact path, or matching query
    const existsInWs = wsSec.items.some((i) => {
      const iId = i.id.toLowerCase();
      const iPath = decodeURIComponent(i.path).toLowerCase();

      if (iId === itemIdLower) return true;
      if (iPath === normPath) return true;

      if (normPath.includes("?") && iPath.includes("?")) {
        const [targetBase, targetQuery] = normPath.split("?");
        const [itemBase, itemQuery] = iPath.split("?");
        if (targetBase === itemBase) {
          const targetParams = new URLSearchParams(targetQuery);
          const itemParams = new URLSearchParams(itemQuery);
          const targetProc = targetParams.get("process") || targetParams.get("processName") || targetParams.get("processId");
          const itemProc = itemParams.get("process") || itemParams.get("processName") || itemParams.get("processId");
          if (targetProc && itemProc && targetProc.toLowerCase() === itemProc.toLowerCase()) return true;
        }
      }
      return false;
    });

    let newSections: NavSectionConfig[];

    if (existsInWs) {
      newSections = config.sections.map((sec) => {
        if (sec.id !== "workspace") return sec;
        return {
          ...sec,
          items: sec.items.map((i) => {
            const iId = i.id.toLowerCase();
            const iPath = decodeURIComponent(i.path).toLowerCase();
            let isMatch = iId === itemIdLower || iPath === normPath;
            if (!isMatch && normPath.includes("?") && iPath.includes("?")) {
              const [targetBase, targetQuery] = normPath.split("?");
              const [itemBase, itemQuery] = iPath.split("?");
              if (targetBase === itemBase) {
                const targetParams = new URLSearchParams(targetQuery);
                const itemParams = new URLSearchParams(itemQuery);
                const targetProc = targetParams.get("process") || targetParams.get("processName") || targetParams.get("processId");
                const itemProc = itemParams.get("process") || itemParams.get("processName") || itemParams.get("processId");
                if (targetProc && itemProc && targetProc.toLowerCase() === itemProc.toLowerCase()) isMatch = true;
              }
            }
            if (isMatch) {
              return {
                ...i,
                visible: true,
                isFeatured: true,
                label: item.label || i.label,
                path: item.path || i.path,
                iconName: item.iconName || i.iconName,
              };
            }
            return i;
          }),
        };
      });
    } else {
      // If it exists in another section (e.g., invoices or insurance-claims in billing), remove it from there
      const isCrossSectionMove = item.id === "invoices" || item.id === "insurance-claims";

      const sectionsWithoutItem = config.sections.map((sec) => {
        if (sec.id === "workspace") return sec;
        if (!isCrossSectionMove) return sec;
        return {
          ...sec,
          items: sec.items.filter(
            (i) => i.id !== item.id && decodeURIComponent(i.path).toLowerCase() !== normPath
          ),
        };
      });

      const newItem: NavItemConfig = {
        id: item.id,
        label: item.label,
        iconName: item.iconName,
        path: item.path,
        visible: true,
        isFeatured: true,
      };

      newSections = sectionsWithoutItem.map((sec) => {
        if (sec.id !== "workspace") return sec;
        return {
          ...sec,
          items: [...sec.items, newItem],
        };
      });
    }

    saveConfig({ ...config, sections: newSections });
  };

  const removeFromWorkspace = (pathOrId: string) => {
    const wsSec = config.sections.find((s) => s.id === "workspace");
    if (!wsSec) return;

    const cleanTarget = decodeURIComponent(pathOrId).toLowerCase().trim();
    const targetItem = wsSec.items.find((i) => {
      const iId = i.id.toLowerCase();
      const iPath = decodeURIComponent(i.path).toLowerCase();
      const iLabel = i.label.toLowerCase();

      if (iId === cleanTarget) return true;
      if (iPath === cleanTarget) return true;
      if (!cleanTarget.startsWith("/") && iLabel === cleanTarget) return true;

      if (cleanTarget.includes("?") && iPath.includes("?")) {
        const [targetBase, targetQuery] = cleanTarget.split("?");
        const [itemBase, itemQuery] = iPath.split("?");
        if (targetBase === itemBase) {
          const targetParams = new URLSearchParams(targetQuery);
          const itemParams = new URLSearchParams(itemQuery);
          const targetProc = targetParams.get("process") || targetParams.get("processName") || targetParams.get("processId");
          const itemProc = itemParams.get("process") || itemParams.get("processName") || itemParams.get("processId");
          if (targetProc && itemProc && targetProc.toLowerCase() === itemProc.toLowerCase()) return true;
        }
      }
      return false;
    });

    if (!targetItem) return;

    const isBillingItem =
      targetItem.id === "invoices" ||
      targetItem.id === "insurance-claims" ||
      targetItem.id === "product-services" ||
      targetItem.id === "reports" ||
      targetItem.path === "/invoices" ||
      targetItem.path === "/claims" ||
      targetItem.path === "/services";

    const newSections = config.sections.map((sec) => {
      if (sec.id === "workspace") {
        return {
          ...sec,
          items: sec.items.filter((i) => i.id !== targetItem.id),
        };
      }
      if (isBillingItem && sec.id === "billing") {
        const alreadyInBilling = sec.items.some((i) => i.id === targetItem.id);
        if (!alreadyInBilling) {
          return {
            ...sec,
            items: [...sec.items, { ...targetItem, visible: true, isFeatured: false }],
          };
        }
      }
      return sec;
    });

    saveConfig({ ...config, sections: newSections });
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
        activeAdminTemplate,
        defaultStartPage: config.defaultStartPage || "/",
        setDefaultStartPage,
        updateConfig,
        resetToDefault,
        resetToAdminTemplate,
        isConfiguring,
        setIsConfiguring,
        toggleItemVisibility,
        toggleItemFeatured,
        moveItem,
        reorderSectionItems,
        toggleSectionDefaultExpanded,
        addToWorkspace,
        removeFromWorkspace,
        isInWorkspace,
      }}
    >
      {children}
    </SidebarMenuContext.Provider>
  );
}

export function useSidebarMenu(): SidebarMenuContextType {
  const context = useContext(SidebarMenuContext);
  if (!context) {
    return {
      config: DEFAULT_SIDEBAR_CONFIG,
      activeAdminTemplate: null,
      defaultStartPage: "/",
      setDefaultStartPage: () => {},
      updateConfig: () => {},
      resetToDefault: () => {},
      resetToAdminTemplate: () => {},
      isConfiguring: false,
      setIsConfiguring: () => {},
      toggleItemVisibility: () => {},
      toggleItemFeatured: () => {},
      moveItem: () => {},
      reorderSectionItems: () => {},
      toggleSectionDefaultExpanded: () => {},
      addToWorkspace: () => {},
      removeFromWorkspace: () => {},
      isInWorkspace: () => false,
    };
  }
  return context;
}
