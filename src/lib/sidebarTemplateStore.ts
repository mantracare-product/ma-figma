import type { ScopingRule } from "./useProcessStore";

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

export interface AdminSidebarTemplate {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  isActive: boolean;
  defaultStartPage: string;
  scopingRules: ScopingRule[];
  sections: NavSectionConfig[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const SIDEBAR_TEMPLATES_EVENT = "sidebarTemplates_updated";
export const SIDEBAR_TEMPLATES_STORAGE_KEY = "mantra_admin_sidebar_templates";

export const DEFAULT_INITIAL_SIDEBAR_TEMPLATES: AdminSidebarTemplate[] = [
  {
    id: "tpl-default-global",
    name: "Standard Organization Baseline",
    description: "Default baseline layout applied to general organizations across all industries and locations.",
    isSystem: true,
    isActive: true,
    defaultStartPage: "/",
    scopingRules: [],
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
    createdAt: "2026-01-01 10:00",
    updatedAt: "2026-01-01 10:00",
    createdBy: "Admin System",
  },
];

export function getStoredSidebarTemplates(): AdminSidebarTemplate[] {
  try {
    const raw = localStorage.getItem(SIDEBAR_TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strip out legacy hardcoded sample templates so only user templates & the revived default baseline remain
        const legacyHardcodedIds = new Set(["tpl-healthcare-ehr", "tpl-automobile-service", "tpl-realestate-sales"]);
        const cleaned = parsed.filter((t: AdminSidebarTemplate) => !legacyHardcodedIds.has(t.id));

        const hasDefault = cleaned.some((p: AdminSidebarTemplate) => p.id === "tpl-default-global");
        let finalTemplates = hasDefault ? cleaned : [...DEFAULT_INITIAL_SIDEBAR_TEMPLATES, ...cleaned];

        // Ensure every template has tasks under workspace
        let templatesChanged = cleaned.length !== parsed.length || !hasDefault;
        finalTemplates = finalTemplates.map((t: AdminSidebarTemplate) => {
          let tChanged = false;
          const updatedSections = (t.sections || []).map((sec: NavSectionConfig) => {
            if (sec.id === "workspace" && !sec.items.some((it) => it.id === "tasks")) {
              tChanged = true;
              const procIdx = sec.items.findIndex((it) => it.id === "processes");
              const taskItem: NavItemConfig = {
                id: "tasks",
                label: "Tasks",
                iconName: "CheckSquare",
                path: "/tasks",
                visible: true,
                isFeatured: true,
              };
              const items = [...sec.items];
              if (procIdx !== -1) {
                items.splice(procIdx + 1, 0, taskItem);
              } else {
                items.push(taskItem);
              }
              return { ...sec, items };
            }
            return sec;
          });
          if (tChanged) {
            templatesChanged = true;
            return { ...t, sections: updatedSections };
          }
          return t;
        });

        if (templatesChanged) {
          localStorage.setItem(SIDEBAR_TEMPLATES_STORAGE_KEY, JSON.stringify(finalTemplates));
        }
        return finalTemplates;
      }
    }
  } catch (err) {
    console.error("Error reading sidebar templates from localStorage", err);
  }

  // Fallback to initial seeds
  try {
    localStorage.setItem(SIDEBAR_TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_SIDEBAR_TEMPLATES));
  } catch {}
  return DEFAULT_INITIAL_SIDEBAR_TEMPLATES;
}

export function saveSidebarTemplate(template: AdminSidebarTemplate): void {
  const current = getStoredSidebarTemplates();
  const index = current.findIndex((t) => t.id === template.id);
  const now = new Date().toISOString().replace("T", " ").substring(0, 16);
  const toSave = { ...template, updatedAt: now };

  let updated: AdminSidebarTemplate[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = toSave;
  } else {
    updated = [toSave, ...current];
  }

  try {
    localStorage.setItem(SIDEBAR_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(SIDEBAR_TEMPLATES_EVENT));
  } catch (err) {
    console.error("Error saving sidebar template", err);
  }
}

export function deleteSidebarTemplate(id: string): boolean {
  const current = getStoredSidebarTemplates();
  const target = current.find((t) => t.id === id);
  if (target?.isSystem && id === "tpl-default-global") {
    return false; // Cannot delete the root fallback template
  }

  const updated = current.filter((t) => t.id !== id);
  try {
    localStorage.setItem(SIDEBAR_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(SIDEBAR_TEMPLATES_EVENT));
    return true;
  } catch (err) {
    console.error("Error deleting sidebar template", err);
    return false;
  }
}

export function isSidebarTemplateMatchingScope(
  template: AdminSidebarTemplate,
  filter: { category?: string; industry?: string; location?: string }
): boolean {
  if (!template) return false;
  const { category, industry, location } = filter;

  const rules = template.scopingRules || [];
  if (rules.length === 0) {
    // Unconstrained scope matches everything unless a specific non-"All" filter is required
    return true;
  }

  return rules.some((rule) => {
    const rCat = rule.industryCategory?.trim();
    const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
    const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

    const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
    const hasInd = rInds.length > 0;
    const hasLoc = rLocs.length > 0;

    if (!hasCat && !hasInd && !hasLoc) return true;

    if (category && category !== "all" && category !== "All") {
      if (hasCat && rCat?.toLowerCase() !== category.toLowerCase()) return false;
    }

    if (industry && industry !== "all" && industry !== "All") {
      if (hasInd && !rInds.some((i) => i.toLowerCase() === industry.toLowerCase())) return false;
    }

    if (location && location !== "all" && location !== "All") {
      if (hasLoc && !rLocs.some((l) => l.toLowerCase() === location.toLowerCase())) return false;
    }

    return true;
  });
}

export function resolveSidebarTemplateForOrg(
  org?: { industryCategory?: string; industry?: string; location?: string; locations?: string[] } | null
): AdminSidebarTemplate {
  const templates = getStoredSidebarTemplates().filter((t) => t.isActive);
  if (!org) {
    return templates.find((t) => t.id === "tpl-default-global") || templates[0] || DEFAULT_INITIAL_SIDEBAR_TEMPLATES[0];
  }

  const category = (org.industryCategory || "").trim().toLowerCase();
  const industry = (org.industry || "").trim().toLowerCase();
  const orgLocations = [
    org.location || "",
    ...(org.locations || []),
  ]
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

  let bestTemplate: AdminSidebarTemplate | null = null;
  let highestScore = -1;

  for (const tpl of templates) {
    const rules = tpl.scopingRules || [];

    // Global baseline template (no scoping rules) gets score 0
    if (rules.length === 0) {
      if (highestScore < 0) {
        highestScore = 0;
        bestTemplate = tpl;
      }
      continue;
    }

    for (const rule of rules) {
      const rCat = (rule.industryCategory || "").trim().toLowerCase();
      const rInds = (rule.industries || [])
        .map((i) => i.trim().toLowerCase())
        .filter((i) => i && i !== "all" && i !== "*");
      const rLocs = (rule.locations || [])
        .map((l) => l.trim().toLowerCase())
        .filter((l) => l && l !== "all" && l !== "*");

      const hasCatConstraint = Boolean(rCat && rCat !== "all" && rCat !== "*");
      const hasIndConstraint = rInds.length > 0;
      const hasLocConstraint = rLocs.length > 0;

      // Rule with no constraints matches everything as fallback (score 0.1)
      if (!hasCatConstraint && !hasIndConstraint && !hasLocConstraint) {
        if (highestScore < 0.1) {
          highestScore = 0.1;
          bestTemplate = tpl;
        }
        continue;
      }

      // Check category match
      const catMatches = !hasCatConstraint || (category && rCat === category);
      if (hasCatConstraint && !catMatches) {
        continue; // Category mismatch
      }

      // Check industry match
      const indMatches = !hasIndConstraint || (industry && rInds.includes(industry));
      if (hasIndConstraint && !indMatches) {
        continue; // Industry mismatch
      }

      // Check location match
      const locMatches = !hasLocConstraint || orgLocations.some((loc) => rLocs.includes(loc));
      if (hasLocConstraint && !locMatches) {
        continue; // Location mismatch
      }

      // Specificity scoring: Industry match (30) + Category match (20) + Location match (20)
      let score = 0;
      if (hasCatConstraint && catMatches) score += 20;
      if (hasIndConstraint && indMatches) score += 30;
      if (hasLocConstraint && locMatches) score += 20;

      if (score > highestScore) {
        highestScore = score;
        bestTemplate = tpl;
      }
    }
  }

  if (bestTemplate) return bestTemplate;

  const globalDefault = templates.find((t) => t.id === "tpl-default-global");
  return globalDefault || templates[0] || DEFAULT_INITIAL_SIDEBAR_TEMPLATES[0];
}

