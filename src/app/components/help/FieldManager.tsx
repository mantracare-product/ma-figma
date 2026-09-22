import React, { useState, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Plus, Asterisk, Check, ChevronRight } from "lucide-react";
import { useFieldRegistry, FieldDefinition, FieldModule, isFieldMatchingOrg } from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { toast } from "sonner";
import { AdminFieldDrawer } from "../../pages/admin/components/AdminFieldDrawer";

const MODULE_LABELS: Record<Exclude<FieldModule, "deal">, string> = {
  client: "Client Fields",
  process: "Process Fields",
  appointment: "Appointment Fields",
  call: "Call Fields",
  service: "Service Fields",
  organization: "Organization Fields",
  teamMember: "Team Member Fields",
  scribe: "AI Scribe Fields",
};

const ALL_MODULES: Exclude<FieldModule, "deal">[] = ["client", "process", "appointment", "call", "service", "organization", "teamMember", "scribe"];

// Module → singular noun for prose labels
const MODULE_NOUN: Record<Exclude<FieldModule, "deal">, { singular: string; plural: string }> = {
  client: { singular: "client", plural: "clients" },
  process: { singular: "process", plural: "processes" },
  appointment: { singular: "appointment", plural: "appointments" },
  call: { singular: "call", plural: "calls" },
  service: { singular: "service", plural: "services" },
  organization: { singular: "organization", plural: "organizations" },
  teamMember: { singular: "team member", plural: "team members" },
  scribe: { singular: "AI Scribe field", plural: "AI Scribe fields" },
};

export interface CreateFieldModalProps {
  lockModule?: FieldModule;
  sourceFormId?: number;
  activeProcessId?: string;
  activeProcessName?: string;
  processStages?: Array<{ id: string; name: string; color?: string }>;
  isAdmin?: boolean;
  onClose: () => void;
  onCreated?: (field: FieldDefinition) => void;
}

export function CreateFieldModal({
  lockModule,
  sourceFormId,
  activeProcessId,
  activeProcessName,
  processStages,
  isAdmin = true,
  onClose,
  onCreated,
}: CreateFieldModalProps) {
  const normModule = (
    lockModule === "deal" ? "process" : (lockModule || "client")
  ) as Exclude<FieldModule, "deal">;

  return (
    <AdminFieldDrawer
      field={null}
      initialModule={normModule}
      lockModule={Boolean(lockModule)}
      activeProcessId={activeProcessId}
      activeProcessName={activeProcessName}
      processStages={processStages}
      isAdmin={isAdmin}
      onClose={onClose}
      onSaved={(newField) => {
        if (onCreated) onCreated(newField);
      }}
    />
  );
}

export interface SelectFieldsModalProps {
  initiallySelected: string[];
  onClose: () => void;
  onApply: (keys: string[]) => void;
  onlyModules?: FieldModule[];
  activeProcessId?: string;
  activeProcessName?: string;
  processStages?: Array<{ id: string; name: string; color?: string }>;
  isAdmin?: boolean;
}

export function SelectFieldsModal({
  initiallySelected,
  onClose,
  onApply,
  onlyModules,
  activeProcessId,
  activeProcessName,
  processStages,
  isAdmin = true,
}: SelectFieldsModalProps) {
  const { getAllFields, updateCustomField } = useFieldRegistry();
  const { activeOrganization } = useOrganization();
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFieldsForModal, setSelectedFieldsForModal] = useState<string[]>(() => initiallySelected);
  const [createFieldModalOpenFor, setCreateFieldModalOpenFor] = useState<FieldModule | null>(null);

  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);

  useEffect(() => {
    const handleUpdate = () => setAllProcesses(getStoredProcesses());
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Compute strictly the stages belonging to the active process
  const resolvedProcessStages = useMemo(() => {
    if (processStages && processStages.length > 0) {
      return processStages.map((s) => ({ id: s.name, name: s.name, color: s.color }));
    }
    if (activeProcessId || activeProcessName) {
      const targetProc = allProcesses.find(
        (p) =>
          (activeProcessId && (p.id === activeProcessId || p.name === activeProcessId)) ||
          (activeProcessName &&
            (p.name.toLowerCase() === activeProcessName.toLowerCase() || p.id === activeProcessName))
      );
      if (targetProc && targetProc.stages && targetProc.stages.length > 0) {
        return targetProc.stages.map((st) => ({ id: st.name, name: st.name, color: st.color }));
      }
    }
    return [];
  }, [processStages, activeProcessId, activeProcessName, allProcesses]);

  // Determine which modules to render
  const targetModules: Exclude<FieldModule, "deal">[] = (onlyModules
    ? onlyModules.map(m => (m === "deal" ? "process" : m))
    : ALL_MODULES) as Exclude<FieldModule, "deal">[];

  // Define collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    targetModules.forEach(m => {
      state[m] = false; // default expanded
    });
    return state;
  });

  const toggleSection = (module: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  // Compile all fields grouped by module, strictly obeying activeOrganization scope
  const groupedFieldsList = targetModules.map(module => {
    const procId = activeProcessId || activeProcessName;
    const fields = getAllFields(module).filter(f =>
      isFieldMatchingOrg(f, activeOrganization, procId) &&
      f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase())
    );
    return {
      module,
      label: MODULE_NOUN[module]?.plural.toUpperCase() || module.toUpperCase(),
      fields,
    };
  }).filter(g => g.fields.length > 0);

  const totalFilteredCount = groupedFieldsList.reduce((acc, curr) => acc + curr.fields.length, 0);

  const handleSelectApply = () => {
    onApply(selectedFieldsForModal);
    toast.success("Fields updated ✓");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed bg-white rounded-xl shadow-2xl flex flex-col"
        style={{
          zIndex: 10000,
          width: "500px",
          maxWidth: "92vw",
          maxHeight: "80vh",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Select Fields
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-50 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={fieldSearchQuery}
              onChange={(e) => setFieldSearchQuery(e.target.value)}
              placeholder="Search fields across all categories..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Collapsible List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupedFieldsList.map(group => {
            const isCollapsed = collapsedSections[group.module];

            return (
              <div key={group.module} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection(group.module)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                >
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {group.label} ({group.fields.length})
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>

                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {group.fields.map(f => {
                        const isChecked = selectedFieldsForModal.includes(f.key);
                        return (
                          <label
                            key={`${group.module}-${f.key}`}
                            className="flex items-center gap-2.5 p-2 hover:bg-blue-50/30 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100/50"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFieldsForModal([...selectedFieldsForModal, f.key]);
                                } else {
                                  setSelectedFieldsForModal(selectedFieldsForModal.filter(k => k !== f.key));
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                              style={{ accentColor: "#1E88E5" }}
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-700 truncate">{f.label}</span>
                                {f.required && (
                                  <span className="text-[10px] text-red-500 font-bold leading-none" title="Required field">
                                    *
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-400 truncate capitalize">
                                {f.source === "system" ? "system" : f.inputType}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCreateFieldModalOpenFor(group.module as FieldModule)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 rounded-md border border-dashed border-blue-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Field
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalFilteredCount === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              No fields found matching your search.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-xl flex-shrink-0">
          <span className="text-xs text-gray-500 font-semibold">
            {selectedFieldsForModal.length} selected
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleSelectApply}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#1E88E5" }}
            >
              APPLY
            </button>
          </div>
        </div>
      </div>

      {createFieldModalOpenFor && (
        <CreateFieldModal
          lockModule={createFieldModalOpenFor}
          activeProcessId={activeProcessId}
          activeProcessName={activeProcessName}
          processStages={resolvedProcessStages}
          isAdmin={isAdmin}
          onClose={() => setCreateFieldModalOpenFor(null)}
          onCreated={(newField) => {
            setSelectedFieldsForModal(prev => [...prev, newField.key]);
            setCreateFieldModalOpenFor(null);
          }}
        />
      )}
    </>
  );
}

