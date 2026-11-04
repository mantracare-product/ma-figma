import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Star,
  GripVertical,
  Check,
  Search,
  Sparkles,
  Stethoscope,
  Activity,
  GitBranch,
  RefreshCw,
  FolderTree,
  Building2,
  Users,
  LayoutDashboard,
  Calendar,
  Phone,
  MessageCircle,
  FileText,
  Database,
  Receipt,
  ShieldCheck,
  Package,
  BarChart3,
  UserCog,
  CreditCard,
  Volume2,
  Layers,
  ScrollText,
  Lock,
  Tag,
  Zap,
  ChevronDown,
  FolderPlus,
  Info,
  MoreVertical,
  Wrench,
} from "lucide-react";
import {
  AdminSidebarTemplate,
  NavSectionConfig,
  NavItemConfig,
  saveSidebarTemplate,
  SIDEBAR_TEMPLATES_EVENT,
} from "../../../../lib/sidebarTemplateStore";
import { AdminControlAccordion } from "./AdminControlAccordion";
import { ScopingRule, getStoredProcesses, Process } from "../../../../lib/useProcessStore";
import { getSidebarIcon } from "../../../components/layout/ConfigureMenuModal";
import { Modal } from "../../../components/ui/Modal";
import { Tooltip } from "../../../components/ui/Tooltip";
import { toast } from "sonner";

interface SidebarTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template: AdminSidebarTemplate | null;
  onSaveSuccess?: () => void;
}

const AVAILABLE_ICONS = [
  "LayoutDashboard",
  "Users",
  "Phone",
  "MessageCircle",
  "RefreshCw",
  "Calendar",
  "Stethoscope",
  "SlidersHorizontal",
  "Zap",
  "Database",
  "FileText",
  "Package",
  "Receipt",
  "ShieldCheck",
  "BarChart3",
  "Building2",
  "UserCog",
  "CreditCard",
  "Volume2",
  "Hash",
  "Layers",
  "Link",
  "ScrollText",
  "Lock",
  "Activity",
  "HeartPulse",
  "GitBranch",
  "Tag",
  "FolderTree",
  "CheckSquare",
  "Globe",
  "Bot",
  "Briefcase",
  "Mail",
  "Inbox",
  "Clock",
  "Sparkles",
  "Star",
  "Award",
  "Shield",
  "Heart",
  "ShoppingCart",
  "Folder",
  "HelpCircle",
  "Send",
  "Bookmark",
  "PieChart",
  "TrendingUp",
  "ClipboardList",
  "CheckCircle",
  "Headphones",
  "Compass",
  "BookOpen",
  "BadgeCheck",
];

const STANDARD_WORKSPACE_PAGES = [
  { label: "Overview", path: "/", iconName: "LayoutDashboard", group: "General" },
  { label: "Contacts", path: "/clients", iconName: "Users", group: "General" },
  { label: "Call Logs", path: "/call-logs", iconName: "Phone", group: "Communication" },
  { label: "Chats", path: "/chats", iconName: "MessageCircle", group: "Communication" },
  { label: "Process Pipelines", path: "/deals", iconName: "RefreshCw", group: "Pipeline" },
  { label: "Appointments", path: "/appointments", iconName: "Calendar", group: "Scheduling" },
  { label: "AI Scribe", path: "/scribe", iconName: "Stethoscope", group: "Clinical" },
  { label: "Products & Services", path: "/services", iconName: "Package", group: "Revenue" },
  { label: "Invoices", path: "/invoices", iconName: "Receipt", group: "Revenue" },
  { label: "Insurance & Claims", path: "/claims", iconName: "ShieldCheck", group: "Revenue" },
  { label: "Reports & Analytics", path: "/reports", iconName: "BarChart3", group: "Analytics" },
  { label: "Workflows", path: "/process", iconName: "SlidersHorizontal", group: "Customization" },
  { label: "Automations", path: "/automation", iconName: "Zap", group: "Customization" },
  { label: "Knowledge Base", path: "/knowledge-base", iconName: "Database", group: "Customization" },
  { label: "Webforms", path: "/web-forms", iconName: "FileText", group: "Customization" },
  { label: "Organization Settings", path: "/settings/organization", iconName: "Building2", group: "Settings" },
  { label: "Team Settings", path: "/settings/team", iconName: "UserCog", group: "Settings" },
  { label: "Billing Settings", path: "/settings/billing", iconName: "CreditCard", group: "Settings" },
  { label: "AI Voices & Models", path: "/settings/voices", iconName: "Volume2", group: "Settings" },
  { label: "Sections & Fields", path: "/settings/sections-fields", iconName: "Layers", group: "Settings" },
  { label: "Integrations", path: "/settings/integrations", iconName: "Link", group: "Settings" },
  { label: "Audit Logs", path: "/settings/audit-logs", iconName: "ScrollText", group: "Settings" },
  { label: "Security", path: "/settings/security", iconName: "Lock", group: "Settings" },
];

const ENTITY_OPTIONS = [
  { id: "client", label: "Clients & Deals" },
  { id: "appointment", label: "Appointments" },
  { id: "invoice", label: "Invoices & Billing" },
  { id: "insurance", label: "Insurance & Claims" },
];

function CommonLargeIconPicker({
  selectedIcon,
  onSelectIcon,
}: {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return AVAILABLE_ICONS;
    const q = search.toLowerCase();
    return AVAILABLE_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Icon Library
        </label>
        <span className="text-[11px] text-gray-400">
          Selected: <strong className="text-blue-600 font-semibold">{selectedIcon}</strong>
        </span>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search 50+ icons (e.g. user, calendar, mail, chart, heart)..."
          className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-9 gap-1.5 max-h-44 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50/40">
        {filteredIcons.map((iconName) => {
          const IconComp = getSidebarIcon(iconName);
          const isSelected = selectedIcon === iconName;
          return (
            <Tooltip key={iconName} text={iconName}>
              <button
                type="button"
                onClick={() => onSelectIcon(iconName)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30 scale-105"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <IconComp className="w-4.5 h-4.5" />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_SECTIONS: NavSectionConfig[] = [
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
];

export default function SidebarTemplateDrawer({
  isOpen,
  onClose,
  template,
  onSaveSuccess,
}: SidebarTemplateDrawerProps) {
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [defaultStartPage, setDefaultStartPage] = useState("/");
  const [scopingRules, setScopingRules] = useState<ScopingRule[]>([]);
  const [sections, setSections] = useState<NavSectionConfig[]>(DEFAULT_SECTIONS);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({
    workspace: true,
    billing: false,
    automation: false,
    settings: false,
  });

  // Drag and Drop State (Items)
  const [draggedItem, setDraggedItem] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ sectionId: string; index: number } | null>(null);

  // Drag and Drop State (Sections)
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  // Section Action Dropdown Menu State
  const [activeSectionMenuId, setActiveSectionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveSectionMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Active View Tab in Drawer
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Add Item to Section Modal State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [targetSectionForNewItem, setTargetSectionForNewItem] = useState<string>("workspace");
  const [addItemCategory, setAddItemCategory] = useState<"workflows" | "pages">("workflows");

  // Add Item Step (Step 1: Item Selection, Step 2: Display Label & Icon)
  const [addItemStep, setAddItemStep] = useState<1 | 2>(1);

  // Workflow options
  const [selectedEntity, setSelectedEntity] = useState<string>("client");
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState("");
  const [selectedWorkflowProcess, setSelectedWorkflowProcess] = useState<Process | null>(null);
  const [workflowCustomLabel, setWorkflowCustomLabel] = useState("");
  const [workflowCustomIcon, setWorkflowCustomIcon] = useState("RefreshCw");

  // Pages options
  const [isCustomPathSelected, setIsCustomPathSelected] = useState(false);
  const [customItemLabel, setCustomItemLabel] = useState("");
  const [customItemPath, setCustomItemPath] = useState("/");
  const [customItemIcon, setCustomItemIcon] = useState("LayoutDashboard");

  // Track existing items across all sections for one-item-per-sidebar rule
  const existingItemsInfo = useMemo(() => {
    const pathMap = new Map<string, string>(); // lowercase normalized path -> section title
    const workflowMap = new Map<string, string>(); // workflowId -> section title

    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        const norm = (item.path || "").trim().toLowerCase();
        if (norm) {
          pathMap.set(norm, sec.title);
        }
        if (item.workflowId) {
          workflowMap.set(item.workflowId, sec.title);
        }
      });
    });

    return { pathMap, workflowMap };
  }, [sections]);

  const { availablePages, alreadyAddedPages } = useMemo(() => {
    const avail: typeof STANDARD_WORKSPACE_PAGES = [];
    const added: Array<{ page: (typeof STANDARD_WORKSPACE_PAGES)[0]; sectionTitle: string }> = [];

    STANDARD_WORKSPACE_PAGES.forEach((page) => {
      const norm = page.path.trim().toLowerCase();
      const secTitle = existingItemsInfo.pathMap.get(norm);
      if (secTitle) {
        added.push({ page, sectionTitle: secTitle });
      } else {
        avail.push(page);
      }
    });

    return { availablePages: avail, alreadyAddedPages: added };
  }, [existingItemsInfo]);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<{
    sectionId: string;
    item: NavItemConfig;
  } | null>(null);

  // Add / Edit Section Modal State
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSection, setEditingSection] = useState<{ id: string; title: string } | null>(null);

  // Load existing template data or reset on open
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setIsActive(template.isActive !== false);
      setDefaultStartPage(template.defaultStartPage || "/");
      setScopingRules(template.scopingRules ? JSON.parse(JSON.stringify(template.scopingRules)) : []);
      setSections(template.sections ? JSON.parse(JSON.stringify(template.sections)) : DEFAULT_SECTIONS);
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setDefaultStartPage("/");
      setScopingRules([]);
      setSections(JSON.parse(JSON.stringify(DEFAULT_SECTIONS)));
    }
  }, [template, isOpen]);

  // Load available processes for workflow picker
  const availableProcesses = useMemo(() => {
    return getStoredProcesses();
  }, [showAddItemModal]);

  const workflowsForEntity = useMemo(() => {
    return availableProcesses.filter((process) => {
      const ent = (process.entityType || "client").toLowerCase();
      if (selectedEntity === "insurance") {
        if (ent !== "insurance" && ent !== "claim") return false;
      } else if (ent !== selectedEntity) {
        return false;
      }
      if (workflowSearchQuery.trim()) {
        const q = workflowSearchQuery.toLowerCase();
        return (
          process.name.toLowerCase().includes(q) ||
          (process.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [availableProcesses, selectedEntity, workflowSearchQuery]);

  // Drag and drop mover: supports reordering within section and across sections
  const handleMoveItem = (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => {
    if (fromSectionId === toSectionId) {
      if (fromIndex === toIndex) return;
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== fromSectionId) return sec;
          const newItems = [...sec.items];
          const [moved] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, moved);
          return { ...sec, items: newItems };
        })
      );
      return;
    }

    let movedItem: NavItemConfig | null = null;
    const sectionsWithoutItem = sections.map((sec) => {
      if (sec.id !== fromSectionId) return sec;
      const newItems = [...sec.items];
      [movedItem] = newItems.splice(fromIndex, 1);
      return { ...sec, items: newItems };
    });

    if (!movedItem) return;

    const finalSections = sectionsWithoutItem.map((sec) => {
      if (sec.id !== toSectionId) return sec;
      const newItems = [...sec.items];
      newItems.splice(toIndex, 0, movedItem!);
      return { ...sec, items: newItems };
    });

    setSections(finalSections);
  };

  // Toggle item visibility
  const handleToggleVisibility = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) =>
            item.id === itemId ? { ...item, visible: !item.visible } : item
          ),
        };
      })
    );
  };

  // Toggle featured (collapsed sidebar pin)
  const handleToggleFeatured = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((item) =>
            item.id === itemId ? { ...item, isFeatured: !item.isFeatured } : item
          ),
        };
      })
    );
  };

  // Delete item
  const handleDeleteItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          items: sec.items.filter((item) => item.id !== itemId),
        };
      })
    );
    toast.success("Item removed from section");
  };

  // Create new section
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section title");
      return;
    }
    const cleanTitle = newSectionTitle.trim().toUpperCase();
    const newId = `sec-${Date.now().toString(36)}`;
    const newSection: NavSectionConfig = {
      id: newId,
      title: cleanTitle,
      defaultExpanded: true,
      items: [],
    };
    setSections((prev) => [...prev, newSection]);
    setExpandedSectionIds((prev) => ({ ...prev, [newId]: true }));
    setNewSectionTitle("");
    setShowAddSectionModal(false);
    toast.success(`Section "${cleanTitle}" created ✓`);
  };

  // Move section (Reordering sections)
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  // Rename section
  const handleSaveRenameSection = () => {
    if (!editingSection || !editingSection.title.trim()) return;
    const cleanTitle = editingSection.title.trim().toUpperCase();
    setSections((prev) =>
      prev.map((s) => (s.id === editingSection.id ? { ...s, title: cleanTitle } : s))
    );
    setEditingSection(null);
    toast.success(`Section renamed to "${cleanTitle}" ✓`);
  };

  // Delete section
  const handleDeleteSection = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    toast.success(`Section "${sec.title}" removed`);
  };

  // Fix & Repair Sidebar Layout: restores missing defaults, cleans up duplicates, and syncs client cache
  const handleRepairSidebar = () => {
    const seenPaths = new Set<string>();
    const repairedSections: NavSectionConfig[] = [];

    // Deduplicate items across all sections
    sections.forEach((sec) => {
      const cleanItems: NavItemConfig[] = [];
      sec.items.forEach((item) => {
        const norm = (item.path || "").trim().toLowerCase();
        if (!norm || !seenPaths.has(norm)) {
          if (norm) seenPaths.add(norm);
          cleanItems.push({
            ...item,
            iconName: item.iconName || "LayoutDashboard",
            visible: item.visible !== false,
          });
        }
      });
      repairedSections.push({ ...sec, items: cleanItems });
    });

    // Ensure standard workspace items exist
    const workspaceSec = repairedSections.find((s) => s.id === "workspace");
    if (workspaceSec) {
      DEFAULT_SECTIONS[0].items.forEach((defItem) => {
        const norm = defItem.path.toLowerCase();
        if (!seenPaths.has(norm)) {
          seenPaths.add(norm);
          workspaceSec.items.push({ ...defItem });
        }
      });
    }

    setSections(repairedSections);

    // Clear any cached client sidebar in localStorage to fix application-wide sidebar errors
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("mantra_sidebar_menu_v")) {
          localStorage.removeItem(key);
        }
      });
      window.dispatchEvent(new CustomEvent(SIDEBAR_TEMPLATES_EVENT));
      window.dispatchEvent(new CustomEvent("storage"));
    } catch (e) {
      console.warn("Could not sync cache", e);
    }

    toast.success("Sidebar structure repaired & active cache synchronized ✓");
  };

  // Open Add Item modal
  const handleOpenAddItem = (sectionId: string) => {
    setTargetSectionForNewItem(sectionId);
    setAddItemStep(1);
    setAddItemCategory("workflows");
    setSelectedEntity("client");
    setSelectedWorkflowProcess(null);
    setWorkflowCustomLabel("");
    setWorkflowCustomIcon("RefreshCw");
    setWorkflowSearchQuery("");
    setIsCustomPathSelected(false);

    // Auto select first available page if any
    const firstAvail = STANDARD_WORKSPACE_PAGES.find(
      (p) => !existingItemsInfo.pathMap.has(p.path.toLowerCase())
    );
    if (firstAvail) {
      setCustomItemLabel(firstAvail.label);
      setCustomItemPath(firstAvail.path);
      setCustomItemIcon(firstAvail.iconName);
    } else {
      setCustomItemLabel("");
      setCustomItemPath("/");
      setCustomItemIcon("LayoutDashboard");
    }

    setShowAddItemModal(true);
  };

  const handleSelectWorkflow = (process: Process) => {
    setSelectedWorkflowProcess(process);
    setWorkflowCustomLabel(process.name);
    const ent = (process.entityType || "client").toLowerCase();
    if (ent === "appointment") {
      setWorkflowCustomIcon("Calendar");
    } else if (ent === "invoice") {
      setWorkflowCustomIcon("Receipt");
    } else if (ent === "insurance" || ent === "claim") {
      setWorkflowCustomIcon("ShieldCheck");
    } else {
      setWorkflowCustomIcon("RefreshCw");
    }
  };

  const handleSelectPathOption = (path: string) => {
    setCustomItemPath(path);
    const page = STANDARD_WORKSPACE_PAGES.find((p) => p.path === path);
    if (page) {
      setCustomItemLabel(page.label);
      setCustomItemIcon(page.iconName);
    }
  };

  // Add selected workflow to section
  const handleConfirmAddWorkflow = () => {
    if (!selectedWorkflowProcess) {
      toast.error("Please select a workflow from the list");
      return;
    }

    const label = workflowCustomLabel.trim() || selectedWorkflowProcess.name;
    const pName = selectedWorkflowProcess.name;
    const pId = selectedWorkflowProcess.id;
    const pType = selectedWorkflowProcess.entityType;
    const slug = pName
      ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : "";

    let path = `/deals?process=${encodeURIComponent(pName)}`;
    let itemId = `process-${slug || pId}`;

    if (pType === "insurance" || pType === "claim") {
      path = `/claims?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
      itemId = `insurance-${slug || pId}`;
    } else if (pType === "appointment") {
      path = `/appointments?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
      itemId = `appointment-${slug || pId}`;
    } else if (pType === "invoice") {
      path = `/invoices?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
      itemId = `invoice-${slug || pId}`;
    }

    const normPath = path.toLowerCase();
    const alreadyInSection =
      existingItemsInfo.workflowMap.get(pId) || existingItemsInfo.pathMap.get(normPath);

    if (alreadyInSection) {
      toast.error(`"${pName}" is already added to section "${alreadyInSection}". You must delete it from that section first.`);
      return;
    }

    const newWorkflowItem: NavItemConfig = {
      id: itemId,
      label,
      iconName: workflowCustomIcon,
      path,
      visible: true,
      isFeatured: true,
      isWorkflow: true,
      workflowId: selectedWorkflowProcess.id,
    };

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== targetSectionForNewItem) return sec;
        return {
          ...sec,
          items: [...sec.items, newWorkflowItem],
        };
      })
    );

    setExpandedSectionIds((prev) => ({ ...prev, [targetSectionForNewItem]: true }));
    setShowAddItemModal(false);
    toast.success(`Pinned workflow "${label}" to section ✓`);
  };

  // Add custom page item to section
  const handleConfirmAddCustomItem = () => {
    const trimmedLabel = customItemLabel.trim();
    const trimmedPath = customItemPath.trim();

    if (!trimmedLabel) {
      toast.error("Please enter an item label");
      return;
    }
    if (!trimmedPath) {
      toast.error("Please select or enter a navigation path");
      return;
    }

    // Enforce one item per sidebar: check across all sections
    const norm = trimmedPath.toLowerCase();
    const alreadyInSection = existingItemsInfo.pathMap.get(norm);
    if (alreadyInSection) {
      toast.error(`Navigation path "${trimmedPath}" is already added to section "${alreadyInSection}". Delete it from that section first to re-add it.`);
      return;
    }

    const newId = `item-${Date.now().toString(36)}`;
    const newItem: NavItemConfig = {
      id: newId,
      label: trimmedLabel,
      path: trimmedPath,
      iconName: customItemIcon,
      visible: true,
      isFeatured: true,
    };

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== targetSectionForNewItem) return sec;
        return {
          ...sec,
          items: [...sec.items, newItem],
        };
      })
    );

    setExpandedSectionIds((prev) => ({ ...prev, [targetSectionForNewItem]: true }));
    setShowAddItemModal(false);
    toast.success(`Added "${newItem.label}" to section ✓`);
  };

  // Save item edits
  const handleSaveItemEdit = () => {
    if (!editingItem) return;
    const trimmedPath = (editingItem.item.path || "").trim().toLowerCase();
    const collision = sections.some((s) =>
      s.items.some((i) => i.id !== editingItem.item.id && (i.path || "").trim().toLowerCase() === trimmedPath)
    );
    if (collision) {
      toast.error(`The path "${editingItem.item.path}" is already in use by another item in this template.`);
      return;
    }

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== editingItem.sectionId) return sec;
        return {
          ...sec,
          items: sec.items.map((i) =>
            i.id === editingItem.item.id ? editingItem.item : i
          ),
        };
      })
    );
    setEditingItem(null);
    toast.success("Navigation item updated");
  };

  // Submit and save template
  const handleSaveTemplate = () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const templateId = template?.id || `tpl-${Date.now()}`;
    const newTemplate: AdminSidebarTemplate = {
      id: templateId,
      name: name.trim(),
      description: description.trim(),
      isActive,
      isSystem: template?.isSystem || false,
      defaultStartPage,
      scopingRules,
      sections,
      createdAt: template?.createdAt || new Date().toISOString().replace("T", " ").substring(0, 16),
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      createdBy: template?.createdBy || "Admin User",
    };

    saveSidebarTemplate(newTemplate);
    toast.success(`Sidebar template "${newTemplate.name}" saved successfully ✓`);
    if (onSaveSuccess) onSaveSuccess();
    onClose();
  };

  // Collect all available pages for start page dropdown
  const allVisibleItems = useMemo(() => {
    const list: Array<{ label: string; path: string }> = [];
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        if (item.visible && !list.some((l) => l.path === item.path)) {
          list.push({ label: `${item.label} (${item.path})`, path: item.path });
        }
      });
    });
    return list;
  }, [sections]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E293B] text-white flex items-center justify-center shadow-2xs shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {template ? "Edit Sidebar Template" : "New Sidebar Template"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle (Slim Segmented Control) */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/70 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("builder")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer leading-none ${
                  activeTab === "builder"
                    ? "bg-white text-gray-900 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Config Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer leading-none ${
                  activeTab === "preview"
                    ? "bg-white text-gray-900 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Live Preview
              </button>
            </div>

            <Tooltip text="Close drawer">
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "builder" ? (
            <>
              {/* Basic Template Info */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Organization Workspace"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Admin Scoping Control Accordion */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Admin Scoping Rules
                </h3>
                <AdminControlAccordion
                  scopingRules={scopingRules}
                  onScopingRulesChange={setScopingRules}
                  defaultAdminControlOpen={true}
                  defaultScopeOpen={true}
                  scopeTooltip="Define which tenant organizations will automatically receive this sidebar based on industry category (e.g. Healthcare), specific industries, and locations."
                />
              </div>

              {/* Navigation Sections & Items Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Sidebar Sections & Navigation Items
                  </h3>
                  <Tooltip text="Drag to reorder items, toggle visibility, mark featured (collapsed sidebar), or add workflows.">
                    <span className="text-gray-400 hover:text-gray-600 cursor-pointer inline-flex items-center">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  </Tooltip>
                </div>

                <div className="space-y-3.5">
                  {sections.map((section, secIndex) => {
                    const isExpanded = expandedSectionIds[section.id] !== false;
                    const isDraggingSection = draggedSectionIndex === secIndex;
                    const isDragOverSection = dragOverSectionIndex === secIndex && draggedSectionIndex !== secIndex;

                    return (
                      <div
                        key={section.id}
                        onDragOver={(e) => {
                          if (draggedSectionIndex !== null) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverSectionIndex !== secIndex) {
                              setDragOverSectionIndex(secIndex);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedSectionIndex !== null) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveSection(draggedSectionIndex, secIndex);
                            setDraggedSectionIndex(null);
                            setDragOverSectionIndex(null);
                          }
                        }}
                        className={`border rounded-xl bg-white shadow-2xs transition-all ${
                          activeSectionMenuId === section.id
                            ? "relative z-30 overflow-visible shadow-md"
                            : "overflow-hidden"
                        } ${
                          isDraggingSection
                            ? "opacity-40 border-dashed border-blue-400 bg-blue-50/50"
                            : isDragOverSection
                            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Section Header */}
                        <div className="px-3.5 py-2.5 bg-gray-50/80 flex items-center justify-between border-b border-gray-100 select-none">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* Section Drag Handle */}
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData("type", "section");
                                e.dataTransfer.effectAllowed = "move";
                                setDraggedSectionIndex(secIndex);
                              }}
                              onDragEnd={() => {
                                setDraggedSectionIndex(null);
                                setDragOverSectionIndex(null);
                              }}
                              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors shrink-0"
                              title="Drag to reorder section"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Section Expand Toggle + Title */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSectionIds((prev) => ({
                                  ...prev,
                                  [section.id]: !isExpanded,
                                }))
                              }
                              className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1 group"
                            >
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                                  isExpanded ? "rotate-0" : "-rotate-90"
                                }`}
                              />
                              <span className="text-xs font-bold text-gray-800 tracking-wider uppercase truncate group-hover:text-blue-600 transition-colors">
                                {section.title}
                              </span>
                            </button>
                          </div>

                          {/* Right: Section Actions Dropdown */}
                          <div className="relative shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSectionMenuId((prev) => (prev === section.id ? null : section.id));
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeSectionMenuId === section.id
                                  ? "bg-gray-200/80 text-gray-800"
                                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"
                              }`}
                              title="Section actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeSectionMenuId === section.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSectionMenuId(null);
                                    handleOpenAddItem(section.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer text-left"
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Add Item</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSectionMenuId(null);
                                    setEditingSection({ id: section.id, title: section.title });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer text-left"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Rename Section</span>
                                </button>

                                <div className="my-1 border-t border-gray-100" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSectionMenuId(null);
                                    handleDeleteSection(section.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete Section</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section Items List with Drag & Drop */}
                        {isExpanded && (
                          <div className="p-2 divide-y divide-gray-100 min-h-[40px]">
                            {section.items.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400">
                                <span>No items in this section yet. </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddItem(section.id)}
                                  className="text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <Plus className="w-3 h-3" /> Add Item
                                </button>
                              </div>
                            ) : (
                              section.items.map((item, index) => {
                                const IconComponent = getSidebarIcon(item.iconName);
                                const isDragging =
                                  draggedItem?.sectionId === section.id && draggedItem?.index === index;
                                const isDragOver =
                                  dragOverTarget?.sectionId === section.id && dragOverTarget?.index === index;

                                return (
                                  <div
                                    key={item.id}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      if (
                                        !dragOverTarget ||
                                        dragOverTarget.sectionId !== section.id ||
                                        dragOverTarget.index !== index
                                      ) {
                                        setDragOverTarget({ sectionId: section.id, index });
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (draggedItem) {
                                        handleMoveItem(draggedItem.sectionId, section.id, draggedItem.index, index);
                                        setDraggedItem(null);
                                        setDragOverTarget(null);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                      isDragging
                                        ? "opacity-30 bg-blue-50 border border-dashed border-blue-400"
                                        : isDragOver
                                        ? "bg-blue-50/70 border-t-2 border-blue-500"
                                        : item.visible
                                        ? "bg-white hover:bg-gray-50/80"
                                        : "bg-gray-50/50 opacity-60"
                                    }`}
                                  >
                                    {/* Left: Drag Handle, Icon, Label, Path */}
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {/* Drag Handle with Tooltip */}
                                      <div
                                        draggable
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          e.dataTransfer.effectAllowed = "move";
                                          setDraggedItem({ sectionId: section.id, index });
                                        }}
                                        onDragEnd={() => {
                                          setDraggedItem(null);
                                          setDragOverTarget(null);
                                        }}
                                        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                      >
                                        <Tooltip text="Drag to reorder">
                                          <GripVertical className="w-4 h-4" />
                                        </Tooltip>
                                      </div>

                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          item.isWorkflow
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                                            : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        <IconComponent className="w-4 h-4" />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs font-semibold text-gray-900 truncate block">
                                          {item.label}
                                        </span>
                                        <span className="text-[11px] text-gray-400 truncate block">
                                          {item.path}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Right: Actions with Tooltips */}
                                    <div className="flex items-center gap-1 shrink-0 ml-3">
                                      {/* Star / Featured Toggle with Tooltip */}
                                      <Tooltip
                                        text={
                                          item.isFeatured
                                            ? "Show in collapsed sidebar (Quick Icon)"
                                            : "Hide from collapsed sidebar"
                                        }
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleToggleFeatured(section.id, item.id)}
                                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                            item.isFeatured
                                              ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                                              : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                          }`}
                                        >
                                          <Star className="w-4 h-4 fill-current" />
                                        </button>
                                      </Tooltip>

                                      {/* Visibility Toggle with Tooltip */}
                                      <Tooltip text={item.visible ? "Visible in sidebar" : "Hidden from sidebar"}>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleVisibility(section.id, item.id)}
                                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                            item.visible
                                              ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                          }`}
                                        >
                                          {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                      </Tooltip>

                                      {/* Edit Item Settings with Tooltip */}
                                      <Tooltip text="Edit navigation item">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingItem({ sectionId: section.id, item: { ...item } })
                                          }
                                          className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                      </Tooltip>

                                      {/* Delete Item with Tooltip */}
                                      <Tooltip text="Remove item from section">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteItem(section.id, item.id)}
                                          className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </Tooltip>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom of all sections: Add Section text button in right corner */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectionTitle("");
                      setShowAddSectionModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Live Sidebar Preview Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3.5 py-2 bg-blue-50/70 rounded-lg border border-blue-100/80">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-900">Live Client Preview</span>
                  <span className="text-[11px] text-blue-600 hidden sm:inline">• Tenant view simulation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewCollapsed((v) => !v)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs cursor-pointer transition-colors"
                >
                  {previewCollapsed ? "Switch to Expanded View" : "Switch to Collapsed View"}
                </button>
              </div>

              {/* Mock Sidebar Viewport */}
              <div className="border border-gray-200 rounded-2xl bg-gray-100 p-6 flex justify-center min-h-[500px]">
                <div
                  className={`bg-white rounded-2xl shadow-xl border border-gray-200/80 flex flex-col transition-all duration-200 overflow-hidden ${
                    previewCollapsed ? "w-[68px]" : "w-64"
                  }`}
                >
                  {/* Mock Org Header */}
                  <div className="p-3 border-b border-gray-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      H
                    </div>
                    {!previewCollapsed && (
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-900 truncate">Heart Care Clinic</p>
                        <p className="text-[10px] text-gray-400 truncate">Healthcare Scope</p>
                      </div>
                    )}
                  </div>

                  {/* Mock Navigation Items */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {previewCollapsed ? (
                      /* Collapsed Icons */
                      <div className="space-y-2 flex flex-col items-center">
                        {sections
                          .flatMap((s) => s.items)
                          .filter((i) => i.visible && i.isFeatured)
                          .map((item) => {
                            const IconC = getSidebarIcon(item.iconName);
                            return (
                              <div
                                key={item.id}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors relative group cursor-pointer"
                                title={item.label}
                              >
                                <IconC className="w-5 h-5" />
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      /* Expanded View */
                      sections.map((sec) => {
                        const visibleItems = sec.items.filter((i) => i.visible);
                        if (visibleItems.length === 0) return null;

                        return (
                          <div key={sec.id} className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                              {sec.id === "billing"
                                ? "REVENUE & INSIGHTS"
                                : sec.id === "automation"
                                ? "CUSTOMIZATIONS"
                                : sec.title}
                            </p>
                            {visibleItems.map((item) => {
                              const IconC = getSidebarIcon(item.iconName);
                              const isStart = item.path === defaultStartPage;

                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                                    isStart
                                      ? "bg-blue-50 text-blue-600 font-semibold"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <IconC className={`w-4 h-4 ${isStart ? "text-blue-600" : "text-gray-500"}`} />
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Mock Footer */}
                  <div className="p-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      DR
                    </div>
                    {!previewCollapsed && (
                      <div className="truncate">
                        <p className="text-xs font-semibold text-gray-800 truncate">Dr. Robert Chen</p>
                        <p className="text-[10px] text-gray-400 truncate">Cardiologist</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            Save Template
          </button>
        </div>
      </div>

      {/* CREATE NEW SECTION MODAL */}
      <Modal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        title="Add New Sidebar Section"
        maxWidth="md"
      >
        <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Section Title <span className="text-red-500">*</span>
              </label>
              <Tooltip text="Custom navigation category heading to group related pages or workflows">
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g. OPERATIONS, BILLING, SUPPORT"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAddSectionModal(false)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSection}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 cursor-pointer"
            >
              Create Section
            </button>
          </div>
        </div>
      </Modal>

      {/* RENAME SECTION MODAL */}
      {editingSection && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSection(null)}
          title="Rename Section"
          maxWidth="md"
        >
          <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Section Title
              </label>
              <input
                type="text"
                value={editingSection.title}
                onChange={(e) =>
                  setEditingSection({ ...editingSection, title: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRenameSection}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD ITEM TO SECTION MODAL (2-STEP WORKFLOW) */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        title={`Add Item to ${sections.find((s) => s.id === targetSectionForNewItem)?.title || "Section"}`}
        maxWidth="lg"
      >
        <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
          {/* Circular Progress Ring Stepper */}
          <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-3">
              {/* Circular Ring SVG */}
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  {/* Active progress arc */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeDasharray="94.25"
                    strokeDashoffset={addItemStep === 1 ? "47.12" : "0"}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-blue-700">
                  {addItemStep}/2
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-900">
                  {addItemStep === 1
                    ? "Step 1: Select Item Category & Route"
                    : "Step 2: Customize Display Label & Icon"}
                </div>
                <p className="text-[11px] text-gray-500">
                  {addItemStep === 1
                    ? "Choose an operational workflow or standard workspace page"
                    : "Set user-facing label and pick an icon from the library"}
                </p>
              </div>
            </div>

            {/* Step pills */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  addItemStep === 1
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "bg-blue-100 text-blue-700 font-bold"
                }`}
              >
                1. Select
              </span>
              <span className="text-gray-300">→</span>
              <span
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  addItemStep === 2
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                2. Label & Icon
              </span>
            </div>
          </div>

          {addItemStep === 1 ? (
            /* STEP 1: ITEM SELECTION */
            <div className="space-y-3.5">
              {/* Item Category Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Item Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={addItemCategory}
                  onChange={(e) => {
                    const newCat = e.target.value as "workflows" | "pages";
                    setAddItemCategory(newCat);
                    setSelectedWorkflowProcess(null);
                  }}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="workflows">Workflows</option>
                  <option value="pages">Pages</option>
                </select>
              </div>

              {addItemCategory === "workflows" ? (
                <>
                  {/* Entity Dropdown (Strictly entity-wise, no All Entities filter) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">
                      Select Entity <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedEntity}
                      onChange={(e) => {
                        setSelectedEntity(e.target.value);
                        setSelectedWorkflowProcess(null);
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {ENTITY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Workflow Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={workflowSearchQuery}
                      onChange={(e) => setWorkflowSearchQuery(e.target.value)}
                      placeholder="Search workflows by name..."
                      className="w-full text-xs pl-8.5 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Workflows List - NAME ONLY */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white">
                    {workflowsForEntity.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No workflows found for the selected entity.
                      </div>
                    ) : (
                      workflowsForEntity.map((process) => {
                        const isSelected = selectedWorkflowProcess?.id === process.id;
                        const pName = process.name;
                        const pId = process.id;
                        const pType = (process.entityType || "client").toLowerCase();
                        let targetPath = `/deals?process=${encodeURIComponent(pName)}`;
                        if (pType === "insurance" || pType === "claim") {
                          targetPath = `/claims?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
                        } else if (pType === "appointment") {
                          targetPath = `/appointments?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
                        } else if (pType === "invoice") {
                          targetPath = `/invoices?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`;
                        }
                        const normPath = targetPath.toLowerCase();
                        const alreadyInSection =
                          existingItemsInfo.workflowMap.get(pId) || existingItemsInfo.pathMap.get(normPath);

                        return (
                          <div
                            key={process.id}
                            onClick={() => {
                              if (alreadyInSection) {
                                toast.warning(
                                  `"${process.name}" is already in "${alreadyInSection}". Delete it from that section first to add it here.`
                                );
                                return;
                              }
                              handleSelectWorkflow(process);
                            }}
                            className={`px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                              alreadyInSection
                                ? "bg-gray-50/80 opacity-60 cursor-not-allowed"
                                : isSelected
                                ? "bg-blue-50/70 border-l-4 border-l-blue-600 cursor-pointer font-semibold"
                                : "hover:bg-gray-50 cursor-pointer"
                            }`}
                          >
                            <span className="text-xs text-gray-900 truncate">
                              {process.name}
                            </span>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {alreadyInSection && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Already in {alreadyInSection}
                                </span>
                              )}
                              {isSelected && !alreadyInSection && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Pages flow in Step 1 */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700">
                        Navigation Path <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {isCustomPathSelected ? "Custom Route Mode" : "Select workspace route"}
                      </span>
                    </div>

                    <select
                      value={isCustomPathSelected ? "__custom__" : customItemPath}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setIsCustomPathSelected(true);
                          setCustomItemPath("/");
                        } else {
                          setIsCustomPathSelected(false);
                          handleSelectPathOption(val);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">-- Choose an available page path --</option>
                      <optgroup label="Available Workspace Pages">
                        {availablePages.map((page) => (
                          <option key={page.path} value={page.path}>
                            {page.label} ({page.path}) — [{page.group}]
                          </option>
                        ))}
                      </optgroup>
                      {alreadyAddedPages.length > 0 && (
                        <optgroup label="Already Added (Delete from section to re-add)">
                          {alreadyAddedPages.map(({ page, sectionTitle }) => (
                            <option key={page.path} value={page.path} disabled>
                              {page.label} ({page.path}) — Already in {sectionTitle}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__custom__">+ Enter Custom Path...</option>
                    </select>

                    {isCustomPathSelected && (
                      <div className="pt-1">
                        <input
                          type="text"
                          value={customItemPath}
                          onChange={(e) => setCustomItemPath(e.target.value)}
                          placeholder="e.g. /custom-page or /integrations/analytics"
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1 Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    addItemCategory === "workflows"
                      ? !selectedWorkflowProcess
                      : !customItemPath || customItemPath.trim() === ""
                  }
                  onClick={() => setAddItemStep(2)}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  Continue to Label & Icon →
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: DISPLAY LABEL & ICON LIBRARY */
            <div className="space-y-4">
              {/* Selected Item Info Card */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Selected {addItemCategory === "workflows" ? "Workflow" : "Page Route"}
                  </span>
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {addItemCategory === "workflows"
                      ? selectedWorkflowProcess?.name
                      : customItemPath}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddItemStep(1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Display Label Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Display Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addItemCategory === "workflows" ? workflowCustomLabel : customItemLabel}
                  onChange={(e) => {
                    if (addItemCategory === "workflows") {
                      setWorkflowCustomLabel(e.target.value);
                    } else {
                      setCustomItemLabel(e.target.value);
                    }
                  }}
                  placeholder="e.g. Client Intake, Invoices, Orders"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Common Large Icon Library */}
              <CommonLargeIconPicker
                selectedIcon={addItemCategory === "workflows" ? workflowCustomIcon : customItemIcon}
                onSelectIcon={(iconName) => {
                  if (addItemCategory === "workflows") {
                    setWorkflowCustomIcon(iconName);
                  } else {
                    setCustomItemIcon(iconName);
                  }
                }}
              />

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddItemStep(1)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  ← Back to Selection
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={
                      addItemCategory === "workflows"
                        ? handleConfirmAddWorkflow
                        : handleConfirmAddCustomItem
                    }
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    {addItemCategory === "workflows" ? "Pin Workflow" : "Add Page"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* EDIT NAVIGATION ITEM MODAL */}
      {editingItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title={`Edit Navigation Item: ${editingItem.item.label}`}
          maxWidth="md"
        >
          <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Display Label</label>
              <input
                type="text"
                value={editingItem.item.label}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, label: e.target.value },
                  })
                }
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Navigation Path</label>
              <input
                type="text"
                value={editingItem.item.path}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, path: e.target.value },
                  })
                }
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <CommonLargeIconPicker
              selectedIcon={editingItem.item.iconName}
              onSelectIcon={(iconName) =>
                setEditingItem({
                  ...editingItem,
                  item: { ...editingItem.item, iconName },
                })
              }
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemEdit}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 cursor-pointer"
              >
                Update Item
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
