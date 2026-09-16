import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { ChevronDown, Layers, Search } from "lucide-react";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

export interface StageItem {
  id?: string;
  name: string;
  processName?: string;
}

export interface StageMultiSelectProps {
  selectedStages?: string[];
  onChange: (stages: string[]) => void;
  availableStages: StageItem[];
  disabled?: boolean;
  isReadOnly?: boolean;
  label?: string;
}

export function StageMultiSelect({
  selectedStages = [],
  onChange,
  availableStages,
  disabled = false,
  isReadOnly = false,
  label = "Required for Stages",
}: StageMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isAllSelected = !selectedStages || selectedStages.length === 0 || selectedStages.includes("all");

  const uniqueStages = useMemo(() => {
    const seen = new Set<string>();
    const list: StageItem[] = [];
    for (const st of availableStages) {
      if (!seen.has(st.name.toLowerCase())) {
        seen.add(st.name.toLowerCase());
        list.push(st);
      }
    }
    return list;
  }, [availableStages]);

  const filteredStages = useMemo(() => {
    if (!search.trim()) return uniqueStages;
    const q = search.toLowerCase();
    return uniqueStages.filter((s) => s.name.toLowerCase().includes(q) || s.processName?.toLowerCase().includes(q));
  }, [uniqueStages, search]);

  const summaryText = useMemo(() => {
    if (uniqueStages.length === 0) return "No stages available";
    if (isAllSelected) {
      return `All Stages (${uniqueStages.length})`;
    }
    if (selectedStages.length === 1) {
      return selectedStages[0];
    }
    if (selectedStages.length <= 2) {
      return selectedStages.join(", ");
    }
    return `${selectedStages.length} Stages Selected (${selectedStages.slice(0, 2).join(", ")} +${selectedStages.length - 2})`;
  }, [uniqueStages, isAllSelected, selectedStages]);

  const handleSelectAll = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (isReadOnly || disabled) return;
    onChange([]);
  };

  const toggleStage = (stageName: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (isReadOnly || disabled) return;
    if (isAllSelected) {
      // Switching from all to just this stage
      onChange([stageName]);
    } else {
      const exists = selectedStages.includes(stageName);
      if (exists) {
        const next = selectedStages.filter((s) => s !== stageName);
        onChange(next);
      } else {
        const next = [...selectedStages, stageName];
        onChange(next);
      }
    }
  };

  return (
    <div className="mt-2.5 p-3 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="block text-xs font-semibold text-amber-900">
            {label} <span className="text-red-500">*</span>
          </label>
          <InfoTooltip text="Specify which pipeline stages this requirement applies to. If a client is in one of these stages, this field/section must be filled." size="sm" />
        </div>
        <span className="text-[10px] text-amber-700 font-medium">
          Stage Gatekeeper
        </span>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || isReadOnly}
            className={`w-full bg-white border border-amber-200 text-slate-800 outline-none flex items-center justify-between transition-all select-none px-3 py-1.5 text-xs rounded-lg min-h-[34px] ${
              disabled || isReadOnly
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                : "hover:border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className={`truncate text-left ${isAllSelected ? "text-slate-800 font-medium" : "text-amber-900 font-semibold"}`}>
                {summaryText}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-100/70 text-amber-800 border border-amber-200 shrink-0 ml-auto">
                {isAllSelected ? `All (${uniqueStages.length})` : `${selectedStages.length}/${uniqueStages.length}`}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[400px] p-2 z-[100005] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          {uniqueStages.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search stages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
            {/* All Stages Option */}
            <div
              onClick={handleSelectAll}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isAllSelected
                  ? "bg-amber-50 text-amber-900 font-semibold"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                />
                <span className="truncate">All Stages in Process</span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal shrink-0 ml-2">
                {uniqueStages.length} stages
              </span>
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* Individual Stages */}
            {filteredStages.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400 italic">
                No stages found
              </div>
            ) : (
              filteredStages.map((stage) => {
                const isSelected = !isAllSelected && selectedStages.includes(stage.name);
                const isImplicitlySelected = isAllSelected;

                return (
                  <div
                    key={stage.name}
                    onClick={(e) => toggleStage(stage.name, e)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-50 text-amber-900 font-medium"
                        : isImplicitlySelected
                        ? "hover:bg-amber-50/40 text-gray-800"
                        : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected || isImplicitlySelected}
                        onChange={(e) => toggleStage(stage.name, e)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                      />
                      <span className="truncate">{stage.name}</span>
                    </div>
                    {stage.processName && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {stage.processName}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
