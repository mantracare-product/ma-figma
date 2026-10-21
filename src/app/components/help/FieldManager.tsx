import React, { useState, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, Plus, Asterisk, Check, ChevronRight } from "lucide-react";
import {
  useFieldRegistry,
  FieldDefinition,
  FieldModule,
  isFieldMatchingOrg,
  isFieldMatchingContactCategory,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { useContactCategories, addContactCategory } from "../../../lib/contactCategoriesStore";
import { toast } from "sonner";
import { AdminFieldDrawer } from "../../pages/admin/components/AdminFieldDrawer";

const MODULE_LABELS: Record<Exclude<FieldModule, "deal">, string> = {
  client: "Contact Fields",
  process: "Process Fields",
  appointment: "Appointment Fields",
  invoice: "Invoice Fields",
  claim: "Claim Fields",
  call: "Call Fields",
  service: "Service Fields",
  organization: "Organization Fields",
  teamMember: "Team Member Fields",
  scribe: "AI Scribe Fields",
};

const ALL_MODULES: Exclude<FieldModule, "deal">[] = ["client", "process", "appointment", "invoice", "claim", "call", "service", "organization", "teamMember"];

// Module → singular noun for prose labels
const MODULE_NOUN: Record<Exclude<FieldModule, "deal">, { singular: string; plural: string }> = {
  client: { singular: "contact", plural: "contacts" },
  process: { singular: "process", plural: "processes" },
  appointment: { singular: "appointment", plural: "appointments" },
  invoice: { singular: "invoice", plural: "invoices" },
  claim: { singular: "claim", plural: "claims" },
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
  initialContactCategory?: string;
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
  initialContactCategory,
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
      initialContactCategory={initialContactCategory}
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
  initiallySelected?: string[];
  currentFieldKeys?: string[];
  onClose: () => void;
  onApply: (keys: string[]) => void;
  onOpenCreateModal?: () => void;
  onlyModules?: FieldModule[];
  activeProcessId?: string;
  activeProcessName?: string;
  processStages?: Array<{ id: string; name: string; color?: string }>;
  isAdmin?: boolean;
  contactCategory?: string;
}

export function SelectFieldsModal({
  initiallySelected,
  currentFieldKeys,
  onClose,
  onApply,
  onOpenCreateModal,
  onlyModules,
  activeProcessId,
  activeProcessName,
  processStages,
  isAdmin = true,
  contactCategory,
}: SelectFieldsModalProps) {
  const { getAllFields, updateCustomField } = useFieldRegistry();
  const { activeOrganization } = useOrganization();
  const contactCategories = useContactCategories();
  const [selectedContactCategory, setSelectedContactCategory] = useState<string>(
    () => contactCategory || "all"
  );
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (contactCategory) {
      setSelectedContactCategory(contactCategory);
    }
  }, [contactCategory]);

  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFieldsForModal, setSelectedFieldsForModal] = useState<string[]>(
    () => initiallySelected || currentFieldKeys || []
  );
  const [createFieldModalOpenFor, setCreateFieldModalOpenFor] = useState<FieldModule | null>(null);

  useEffect(() => {
    if (initiallySelected) {
      setSelectedFieldsForModal(initiallySelected);
    } else if (currentFieldKeys) {
      setSelectedFieldsForModal(currentFieldKeys);
    }
  }, [initiallySelected, currentFieldKeys]);

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

  // Compile all fields grouped by module, strictly obeying activeOrganization scope and contact category
  const groupedFieldsList = targetModules.map(module => {
    const procId = activeProcessId || activeProcessName;
    const fields = getAllFields(module).filter(f => {
      if (!isFieldMatchingOrg(f, activeOrganization, procId)) return false;
      if (module === "client" && selectedContactCategory && selectedContactCategory !== "all") {
        if (!isFieldMatchingContactCategory(f, selectedContactCategory)) return false;
      }
      return f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase());
    });
    return {
      module,
      label: module === "client" ? "CONTACT" : (MODULE_NOUN[module]?.plural.toUpperCase() || module.toUpperCase()),
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
          width: "520px",
          maxWidth: "92vw",
          maxHeight: "82vh",
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
        <div className="p-3.5 border-b border-gray-100 flex-shrink-0 bg-gray-50/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={fieldSearchQuery}
              onChange={(e) => setFieldSearchQuery(e.target.value)}
              placeholder={
                selectedContactCategory !== "all"
                  ? `Search ${selectedContactCategory} contact fields...`
                  : "Search contact fields..."
              }
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Collapsible List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupedFieldsList.map(group => {
            const isCollapsed = collapsedSections[group.module];

            return (
              <div key={group.module} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                {group.module === "client" ? (
                  <div className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50/60 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSection(group.module)}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                          CONTACT
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          ({group.fields.length})
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      </button>

                      <span className="text-gray-300 font-light text-xs">|</span>

                      {/* Contact Category Filter Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCategoryDropdown(!showCategoryDropdown);
                          }}
                          className="h-7 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          <span className="text-gray-400 font-normal text-[11px]">Category:</span>
                          <span className="max-w-[120px] truncate text-blue-600 font-bold text-[11px]">
                            {selectedContactCategory === "all" ? "All Categories" : selectedContactCategory}
                          </span>
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showCategoryDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-[10001]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCategoryDropdown(false);
                              }}
                            />
                            <div
                              className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[10002] py-1 max-h-56 overflow-y-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedContactCategory("all");
                                  setShowCategoryDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                  selectedContactCategory === "all"
                                    ? "bg-blue-50 text-blue-600 font-bold"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span>All Categories</span>
                                {selectedContactCategory === "all" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                              {contactCategories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setSelectedContactCategory(cat);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                    selectedContactCategory === cat
                                      ? "bg-blue-50 text-blue-600 font-bold"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span className="truncate">{cat}</span>
                                  {selectedContactCategory === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                </button>
                              ))}
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCategoryDropdown(false);
                                  setIsAddCategoryOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Category...
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSection(group.module)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.module)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {group.label} ({group.fields.length})
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                )}

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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] text-gray-400 truncate capitalize">
                                  {f.source === "system" ? "system" : f.inputType}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCreateModal) {
                            onOpenCreateModal();
                          } else {
                            setCreateFieldModalOpenFor(group.module as FieldModule);
                          }
                        }}
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
          initialContactCategory={selectedContactCategory !== "all" ? selectedContactCategory : (contactCategory || "Lead")}
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

      {/* Add Category Modal Popup */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80 max-w-[90vw] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Add New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Partners, Vendors, Employees"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName.trim()) {
                  addContactCategory(newCategoryName.trim());
                  setSelectedContactCategory(newCategoryName.trim());
                  setNewCategoryName("");
                  setIsAddCategoryOpen(false);
                  toast.success("Category added successfully");
                }
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryOpen(false);
                  setNewCategoryName("");
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    addContactCategory(newCategoryName.trim());
                    setSelectedContactCategory(newCategoryName.trim());
                    setNewCategoryName("");
                    setIsAddCategoryOpen(false);
                    toast.success("Category added successfully");
                  }
                }}
                disabled={!newCategoryName.trim()}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

