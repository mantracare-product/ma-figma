import React, { useState, useEffect } from "react";
import DrawerShell from "../../components/ui/DrawerShell";
import { WIDGET_REGISTRY } from "./overviewWidgets";
import type { CustomDashboard, WidgetSource, FilterKey } from "./overviewTypes";
import { Check, ChevronUp, ChevronDown, Trash2, LayoutDashboard, Layers, Filter } from "lucide-react";

interface CreateDashboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dashboard: CustomDashboard) => void;
  dashboardToEdit?: CustomDashboard | null;
  orgId: string;
}

const SOURCE_LABELS: Record<WidgetSource, string> = {
  calls: "Calls",
  communication: "Communication",
  workflows: "Workflows",
  automation: "Automation",
  revenue: "Revenue",
  ar: "A/R",
};

export const CreateDashboardDrawer: React.FC<CreateDashboardDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  dashboardToEdit,
  orgId,
}) => {
  const [name, setName] = useState("");
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<WidgetSource | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardToEdit) {
      setName(dashboardToEdit.name);
      setSelectedWidgetIds(dashboardToEdit.widgetIds || []);
    } else {
      setName("");
      setSelectedWidgetIds(["calls_total", "calls_success_rate", "calls_volume_chart"]);
    }
    setError(null);
  }, [dashboardToEdit, isOpen]);

  const allWidgets = Object.values(WIDGET_REGISTRY);

  const filteredWidgets =
    activeCategory === "all"
      ? allWidgets
      : allWidgets.filter((w) => w.source === activeCategory);

  const toggleWidget = (id: string) => {
    setSelectedWidgetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedWidgetIds.length) return;
    const next = [...selectedWidgetIds];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setSelectedWidgetIds(next);
  };

  const removeWidget = (id: string) => {
    setSelectedWidgetIds((prev) => prev.filter((x) => x !== id));
  };

  // Derived filter keys from selected widgets
  const derivedFilters = Array.from(
    new Set(
      selectedWidgetIds.flatMap(
        (id) => WIDGET_REGISTRY[id]?.supportedFilters || []
      )
    )
  ) as FilterKey[];

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please provide a name for this dashboard.");
      return;
    }
    if (selectedWidgetIds.length === 0) {
      setError("Please select at least one widget.");
      return;
    }

    const dashboard: CustomDashboard = {
      id: dashboardToEdit?.id || `dash-${Date.now()}`,
      name: trimmed,
      orgId: orgId || "default",
      widgetIds: selectedWidgetIds,
      createdAt: dashboardToEdit?.createdAt || Date.now(),
    };

    onSave(dashboard);
    onClose();
  };

  const footer = (
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-slate-500 font-medium">
        {selectedWidgetIds.length} widget{selectedWidgetIds.length === 1 ? "" : "s"} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-2xs"
        >
          {dashboardToEdit ? "Save Changes" : "Create Dashboard"}
        </button>
      </div>
    </div>
  );

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={dashboardToEdit ? "Edit Custom Dashboard" : "Create Custom Dashboard"}
      subtitle="Assemble custom metrics, charts, and KPIs from any business domain"
      icon={<LayoutDashboard className="w-5 h-5 text-blue-600" />}
      width="max-w-[760px]"
      footer={footer}
    >
      <div className="p-6 space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Dashboard Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Executive Performance, Claims Summary, AR Followup"
            className="w-full px-3.5 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        {/* Derived filters pill bar */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>Derived Filters</span>
            <span className="text-[11px] text-slate-400 font-normal">
              (will appear automatically based on selected widgets)
            </span>
          </div>
          {derivedFilters.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No filters required yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {derivedFilters.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md capitalize"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Selected Widgets Order */}
        {selectedWidgetIds.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Selected Widgets & Layout Order ({selectedWidgetIds.length})
              </label>
              <button
                type="button"
                onClick={() => setSelectedWidgetIds([])}
                className="text-[11px] text-red-600 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedWidgetIds.map((id, idx) => {
                const widget = WIDGET_REGISTRY[id];
                if (!widget) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{widget.title}</span>
                      <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-100 text-slate-500">
                        {SOURCE_LABELS[widget.source]}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600">
                        {widget.type.toUpperCase()} (Col {widget.colSpan || 1})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveWidget(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(idx, "down")}
                        disabled={idx === selectedWidgetIds.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWidget(id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Widget Selector Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Available Widgets
          </label>
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Sources
            </button>
            {(Object.keys(SOURCE_LABELS) as WidgetSource[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {SOURCE_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Widget Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredWidgets.map((widget) => {
              const isSelected = selectedWidgetIds.includes(widget.id);
              return (
                <div
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isSelected
                      ? "bg-blue-50/40 border-blue-500/80 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {widget.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {SOURCE_LABELS[widget.source]}
                      </span>
                    </div>
                    {widget.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {widget.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] uppercase font-semibold rounded bg-slate-100 text-slate-600">
                        {widget.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Width: {widget.colSpan || 1} col
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
};
export default CreateDashboardDrawer;
