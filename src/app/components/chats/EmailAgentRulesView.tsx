import React, { useState, useEffect, useMemo } from "react";
import { UserPlus, CornerUpRight, Pencil, SlidersHorizontal, Trash2, Filter, Sparkles } from "lucide-react";
import { useEmailAgentStore, EmailLabel } from "../../../lib/emailAgentStore";
import TableComponent, { TableColumn, TableRowAction, TableBulkAction } from "../ui/TableComponent";
import LabelRuleDrawer from "./LabelRuleDrawer";
import { toast } from "sonner";

interface EmailAgentRulesViewProps {
  searchQuery?: string;
  filterType?: "all" | "active" | "custom" | "templates";
}

export default function EmailAgentRulesView({
  searchQuery = "",
  filterType = "all",
}: EmailAgentRulesViewProps) {
  const { config, updateConfig } = useEmailAgentStore();

  // Selection state for row checkbox selector
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<EmailLabel | null>(null);

  // Listen for "+ Add Rule" trigger from PageTopBar
  useEffect(() => {
    const handleOpenAdd = () => {
      setSelectedLabel(null);
      setIsDrawerOpen(true);
    };
    window.addEventListener("open-add-label-rule-drawer", handleOpenAdd);
    return () => window.removeEventListener("open-add-label-rule-drawer", handleOpenAdd);
  }, []);

  // Combine custom and predefined labels
  const allLabels = useMemo(() => {
    return [
      ...config.step1Labels.customLabels,
      ...config.step1Labels.predefinedLabels,
    ];
  }, [config.step1Labels.customLabels, config.step1Labels.predefinedLabels]);

  // Filtered labels
  const filteredLabels = useMemo(() => {
    return allLabels.filter((lbl) => {
      // Filter tab
      if (filterType === "active" && !lbl.enabled) return false;
      if (filterType === "custom" && lbl.isPredefined) return false;
      if (filterType === "templates" && !lbl.isPredefined) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = lbl.name.toLowerCase().includes(q);
      const matchDesc = lbl.description.toLowerCase().includes(q);
      const matchRule = (lbl.draftingRule || "").toLowerCase().includes(q);
      const matchForward = (lbl.forwardTo || "").toLowerCase().includes(q);
      return matchName || matchDesc || matchRule || matchForward;
    });
  }, [allLabels, filterType, searchQuery]);

  // Toggle label active
  const handleToggleEnabled = (labelId: string) => {
    updateConfig((prev) => {
      const isPredefined = prev.step1Labels.predefinedLabels.some((l) => l.id === labelId);
      if (isPredefined) {
        return {
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            predefinedLabels: prev.step1Labels.predefinedLabels.map((l) =>
              l.id === labelId ? { ...l, enabled: l.enabled === false ? true : false } : l
            ),
          },
        };
      }
      return {
        ...prev,
        step1Labels: {
          ...prev.step1Labels,
          customLabels: prev.step1Labels.customLabels.map((l) =>
            l.id === labelId ? { ...l, enabled: l.enabled === false ? true : false } : l
          ),
        },
      };
    });
    toast.success("Rule status updated");
  };

  // Save label (create or update)
  const handleSaveLabel = (updatedLabel: EmailLabel) => {
    updateConfig((prev) => {
      if (updatedLabel.isPredefined) {
        return {
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            predefinedLabels: prev.step1Labels.predefinedLabels.map((l) =>
              l.id === updatedLabel.id ? updatedLabel : l
            ),
          },
        };
      }

      const exists = prev.step1Labels.customLabels.some((l) => l.id === updatedLabel.id);
      if (exists) {
        return {
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            customLabels: prev.step1Labels.customLabels.map((l) =>
              l.id === updatedLabel.id ? updatedLabel : l
            ),
          },
        };
      }
      return {
        ...prev,
        step1Labels: {
          ...prev.step1Labels,
          customLabels: [updatedLabel, ...prev.step1Labels.customLabels],
        },
      };
    });
  };

  // Delete label
  const handleDeleteLabel = (labelId: string) => {
    updateConfig((prev) => ({
      ...prev,
      step1Labels: {
        ...prev.step1Labels,
        customLabels: prev.step1Labels.customLabels.filter((l) => l.id !== labelId),
      },
    }));
    toast.success("Label rule deleted");
  };

  const handleEditLabel = (lbl: EmailLabel) => {
    setSelectedLabel(lbl);
    setIsDrawerOpen(true);
  };

  // Table Columns (Name is first, Status is last)
  const columns: TableColumn<EmailLabel>[] = [
    {
      id: "name",
      header: "LABEL RULE",
      align: "left",
      width: "180px",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleEditLabel(row)}
          className="text-xs font-bold text-[#1E293B] hover:text-[#1456f0] transition-colors text-left cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {row.name}
        </button>
      ),
    },
    {
      id: "description",
      header: "CLASSIFICATION TRIGGER (CRITERIA)",
      align: "left",
      render: (row) => (
        <div className="flex items-center gap-1.5 min-w-0">
          {row.criteriaType === "filters" ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <Filter className="w-2.5 h-2.5" />
              <span>Filters</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI</span>
            </span>
          )}
          <span className="text-xs text-slate-600 truncate" title={row.description}>
            {row.description || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "draftingRule",
      header: "DRAFTING RULE",
      align: "left",
      width: "180px",
      render: (row) => (
        row.autoDraftEnabled !== false && row.draftingRule ? (
          <span className="text-xs text-slate-700 italic line-clamp-1" title={row.draftingRule}>
            "{row.draftingRule}"
          </span>
        ) : row.autoDraftEnabled === false ? (
          <span className="text-xs text-slate-400">Off</span>
        ) : (
          <span className="text-xs text-slate-400">Standard reply</span>
        )
      ),
    },
    {
      id: "crmAction",
      header: "CRM ACTION",
      align: "left",
      width: "170px",
      render: (row) => (
        row.autoCreateContact ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
            <UserPlus className="w-3 h-3 text-blue-600" />
            <span>Auto-Create: {row.entityType || "Contact"}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
      ),
    },
    {
      id: "handoffRule",
      header: "HANDOFF RULE",
      align: "left",
      width: "160px",
      render: (row) => (
        row.handoffEnabled ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            <CornerUpRight className="w-3 h-3 text-amber-600" />
            <span className="truncate max-w-[120px]">{row.forwardTo || "Escalate"}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
      ),
    },
    {
      id: "status",
      header: "STATUS",
      align: "left",
      width: "110px",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            row.enabled !== false
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          {row.enabled !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  // Row Actions (hamburger menu via actionIcon="menu")
  const getRowActions = (row: EmailLabel): TableRowAction<EmailLabel>[] => [
    {
      label: "Edit Rule",
      icon: <Pencil className="w-3.5 h-3.5 text-blue-600" />,
      onClick: () => handleEditLabel(row),
    },
    {
      label: row.enabled !== false ? "Set as Inactive" : "Set as Active",
      icon: <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />,
      onClick: () => handleToggleEnabled(row.id),
    },
    {
      label: "Delete Rule",
      icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
      isDanger: true,
      onClick: () => handleDeleteLabel(row.id),
      hidden: Boolean(row.isPredefined),
    },
  ];

  // Bulk Actions
  const bulkActions: TableBulkAction[] = [
    {
      label: "Set Active",
      onClick: (ids) => {
        updateConfig((prev) => ({
          ...prev,
          step1Labels: {
            customLabels: prev.step1Labels.customLabels.map((l) =>
              ids.has(l.id) ? { ...l, enabled: true } : l
            ),
            predefinedLabels: prev.step1Labels.predefinedLabels.map((l) =>
              ids.has(l.id) ? { ...l, enabled: true } : l
            ),
          },
        }));
        setSelectedIds(new Set());
        toast.success(`Activated ${ids.size} rules`);
      },
    },
    {
      label: "Set Inactive",
      onClick: (ids) => {
        updateConfig((prev) => ({
          ...prev,
          step1Labels: {
            customLabels: prev.step1Labels.customLabels.map((l) =>
              ids.has(l.id) ? { ...l, enabled: false } : l
            ),
            predefinedLabels: prev.step1Labels.predefinedLabels.map((l) =>
              ids.has(l.id) ? { ...l, enabled: false } : l
            ),
          },
        }));
        setSelectedIds(new Set());
        toast.success(`Deactivated ${ids.size} rules`);
      },
    },
    {
      label: "Delete Selected",
      isDanger: true,
      onClick: (ids) => {
        updateConfig((prev) => ({
          ...prev,
          step1Labels: {
            ...prev.step1Labels,
            customLabels: prev.step1Labels.customLabels.filter((l) => !ids.has(l.id)),
          },
        }));
        setSelectedIds(new Set());
        toast.success(`Deleted selected custom rules`);
      },
    },
  ];

  return (
    <div className="w-full">
      <TableComponent<EmailLabel>
        className="rounded-2xl border-gray-200/90 shadow-xs"
        data={filteredLabels}
        columns={columns}
        getRowId={(lbl) => lbl.id}
        rowActions={getRowActions}
        actionIcon="menu"
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(new Set(Array.from(ids) as string[]))}
        bulkActions={bulkActions}
        enableColumnCustomization={true}
        onRowClick={(lbl) => handleEditLabel(lbl)}
        defaultRowsPerPage={20}
        emptyMessage="No label rules found. Click '+ Add Rule' in the topbar to create one."
      />

      {/* Slide-over Drawer for Rule Settings */}
      <LabelRuleDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        label={selectedLabel}
        onSave={handleSaveLabel}
        onDelete={handleDeleteLabel}
      />
    </div>
  );
}
