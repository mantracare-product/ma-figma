import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { ChevronDown, GitBranch, Search } from "lucide-react";
import { Process } from "../../../../lib/useProcessStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

export interface ProcessMultiSelectProps {
  selectedProcessIds?: string[];
  onChange: (processIds: string[]) => void;
  availableProcesses: Process[];
  disabled?: boolean;
  isReadOnly?: boolean;
  hasScopeRules?: boolean;
}

export function ProcessMultiSelect({
  selectedProcessIds = [],
  onChange,
  availableProcesses,
  disabled = false,
  isReadOnly = false,
  hasScopeRules = false,
}: ProcessMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isAllSelected = !selectedProcessIds || selectedProcessIds.length === 0 || selectedProcessIds.includes("all");

  const filteredProcesses = useMemo(() => {
    if (!search.trim()) return availableProcesses;
    const q = search.toLowerCase();
    return availableProcesses.filter((p) => p.name.toLowerCase().includes(q));
  }, [availableProcesses, search]);

  const selectedCount = isAllSelected ? availableProcesses.length : selectedProcessIds.length;

  const summaryText = useMemo(() => {
    if (availableProcesses.length === 0) return "No processes available in scope";
    if (isAllSelected) {
      return hasScopeRules
        ? `All in Scope (${availableProcesses.length})`
        : `All Processes (${availableProcesses.length})`;
    }
    if (selectedProcessIds.length === 1) {
      const p = availableProcesses.find((proc) => proc.id === selectedProcessIds[0]);
      return p ? p.name : "1 Process Selected";
    }
    const names = selectedProcessIds
      .map((id) => availableProcesses.find((p) => p.id === id)?.name)
      .filter(Boolean);
    if (names.length <= 2) {
      return names.join(", ");
    }
    return `${selectedProcessIds.length} Selected (${names.slice(0, 2).join(", ")} +${names.length - 2})`;
  }, [availableProcesses, isAllSelected, hasScopeRules, selectedProcessIds]);

  const handleSelectAll = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (isReadOnly || disabled) return;
    onChange([]);
  };

  const toggleProcess = (procId: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (isReadOnly || disabled) return;
    if (isAllSelected) {
      // Switching from "all" to selecting just this one process
      onChange([procId]);
    } else {
      const exists = selectedProcessIds.includes(procId);
      if (exists) {
        const next = selectedProcessIds.filter((id) => id !== procId);
        onChange(next);
      } else {
        const next = [...selectedProcessIds, procId];
        onChange(next);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Processes <span className="text-red-500">*</span>
        </label>
        <InfoTooltip text="Select which processes matching the scope rules this is assigned to. Multiple processes can be selected." size="sm" />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || isReadOnly}
            className={`w-full bg-white border border-slate-200 text-slate-800 outline-none flex items-center justify-between transition-all select-none px-3.5 py-2 text-xs rounded-lg min-h-[38px] ${
              disabled || isReadOnly
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                : "hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <GitBranch className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className={`truncate text-left ${selectedCount > 0 ? "text-slate-800 font-medium" : "text-slate-400 font-normal"}`}>
                {summaryText}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0 ml-auto">
                {isAllSelected ? `All (${availableProcesses.length})` : `${selectedProcessIds.length}/${availableProcesses.length}`}
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[440px] p-2 z-[100005] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          {availableProcesses.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search processes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {/* All Processes Option */}
            <div
              onClick={handleSelectAll}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                isAllSelected
                  ? "bg-blue-50 text-blue-900 font-semibold"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="truncate">
                  {hasScopeRules ? "All Processes in Scope" : "All Processes"}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal shrink-0 ml-2">
                {availableProcesses.length} total
              </span>
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* Individual Processes */}
            {filteredProcesses.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400 italic">
                {availableProcesses.length === 0 ? "No processes match the scope rules" : "No matching processes found"}
              </div>
            ) : (
              filteredProcesses.map((proc) => {
                const isSelected = !isAllSelected && selectedProcessIds.includes(proc.id);
                const isImplicitlySelected = isAllSelected;

                return (
                  <div
                    key={proc.id}
                    onClick={(e) => toggleProcess(proc.id, e)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 text-blue-900 font-medium"
                        : isImplicitlySelected
                        ? "hover:bg-blue-50/40 text-gray-800"
                        : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected || isImplicitlySelected}
                        onChange={(e) => toggleProcess(proc.id, e)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                      <span className="truncate">{proc.name}</span>
                    </div>
                    {proc.stages && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {proc.stages.length} {proc.stages.length === 1 ? "stage" : "stages"}
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
