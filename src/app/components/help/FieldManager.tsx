import React, { useState } from "react";
import { Search, X, Info, ChevronDown, Plus } from "lucide-react";
import { useFieldRegistry, FieldDefinition, FieldModule, FieldInputType } from "../../context/FieldRegistryContext";
import { toast } from "sonner";

const FIELD_TYPE_MAP: Record<string, FieldInputType> = {
  "String": "text",
  "List": "select",
  "Multi-Select List": "multiselect",
  "Date/Time": "date_time",
  "Date": "date",
  "Book a Resource": "text",
  "Address": "textarea",
  "Link": "link",
  "File": "text",
  "Money": "money",
  "Yes/No": "yes_no",
  "Number": "number",
  "WhatsApp Link": "whatsapp_link",
};

const MODULE_LABELS: Record<Exclude<FieldModule, "deal">, string> = {
  client: "Client Fields",
  process: "Process Fields",
  appointment: "Appointment Fields",
  call: "Call Fields",
  service: "Service Fields",
  organization: "Organization Fields",
  teamMember: "Team Member Fields",
};

const ALL_MODULES: Exclude<FieldModule, "deal">[] = ["client", "process", "appointment", "call", "service", "organization"];

import { resolveVisibility } from "../../context/FieldRegistryContext";

// Module → singular noun for prose labels
const MODULE_NOUN: Record<Exclude<FieldModule, "deal">, { singular: string; plural: string }> = {
  client: { singular: "client", plural: "clients" },
  process: { singular: "process", plural: "processes" },
  appointment: { singular: "appointment", plural: "appointments" },
  call: { singular: "call", plural: "calls" },
  service: { singular: "service", plural: "services" },
  organization: { singular: "organization", plural: "organizations" },
  teamMember: { singular: "team member", plural: "team members" },
};

interface CreateFieldModalProps {
  lockModule?: FieldModule;
  sourceFormId?: number;
  onClose: () => void;
  onCreated?: (field: FieldDefinition) => void;
}

export function CreateFieldModal({
  lockModule,
  sourceFormId,
  onClose,
  onCreated,
}: CreateFieldModalProps) {
  const { getAllFields, addCustomField } = useFieldRegistry();

  const [selectedModule, setSelectedModule] = useState<Exclude<FieldModule, "deal">>(() => {
    if (lockModule) {
      return (lockModule === "deal" ? "process" : lockModule) as Exclude<FieldModule, "deal">;
    }
    return "client";
  });

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("String");
  const [fieldRequired, setFieldRequired] = useState(false);

  const [specificSearch, setSpecificSearch] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [restrictVisibility, setRestrictVisibility] = useState(false);

  const handleRestrictChange = (checked: boolean) => {
    setRestrictVisibility(checked);
    if (!checked) {
      setSelectedRecordIds([]);
    }
  };

  // Load clients list when selected module is client
  const [clientList, setClientList] = useState<{ id: string; name: string; email: string }[]>([]);
  React.useEffect(() => {
    if (selectedModule === "client") {
      try {
        const raw = sessionStorage.getItem("clients");
        const parsed: any[] = raw ? JSON.parse(raw) : [];
        setClientList(parsed.map(c => ({ id: c.id, name: c.name || "", email: c.email || "" })));
      } catch { setClientList([]); }
    }
  }, [selectedModule]);

  const filteredClients = clientList.filter(c =>
    c.name.toLowerCase().includes(specificSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(specificSearch.toLowerCase())
  );

  const toggleRecord = (id: string) => {
    setSelectedRecordIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateApply = () => {
    if (!newFieldName.trim()) {
      toast.error("Please enter a field name");
      return;
    }

    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const allFields = getAllFields(selectedModule);

    if (allFields.some(f => f.key === key)) {
      toast.error("A field with this name already exists in this module");
      return;
    }

    const inputType = FIELD_TYPE_MAP[newFieldType] || "text";

    const newField = addCustomField(selectedModule, {
      key,
      label: newFieldName.trim(),
      module: selectedModule,
      inputType,
      required: fieldRequired,
      // Save visibleToRecordIds only if we actually picked specific clients
      visibleToRecordIds: (selectedModule === "client" && selectedRecordIds.length > 0) ? selectedRecordIds : undefined,
      options: inputType === "select" ? [
        { id: 1, label: "Option 1", value: "option_1" },
        { id: 2, label: "Option 2", value: "option_2" }
      ] : undefined,
      placeholder: `Enter ${newFieldName.toLowerCase()}`,
      sourceFormId,
    });

    toast.success(`Field "${newField.label}" created successfully in ${MODULE_LABELS[selectedModule]}`);
    if (onCreated) onCreated(newField);
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
          width: "460px",
          maxHeight: "90vh",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontFamily: "Outfit, sans-serif",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Create Custom Field {lockModule ? `— ${MODULE_LABELS[selectedModule]}` : ""}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>
              This field will be available to select on every{" "}
              <span className="font-medium text-gray-500">{MODULE_NOUN[selectedModule].singular}</span>{" "}
              once created. Choose below whether it should also show automatically, and for whom.
            </p>
          </div>
          <button onClick={onClose} className="p-1 mt-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!lockModule && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Module</label>
              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value as any);
                  setSelectedRecordIds([]);
                  setSpecificSearch("");
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-colors cursor-pointer font-medium"
              >
                {ALL_MODULES.map(m => (
                  <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Field Name</label>
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g. Insurance ID"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Field Type</label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-colors cursor-pointer font-medium"
            >
              {Object.keys(FIELD_TYPE_MAP).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Required checkbox */}
          <div className="pt-2 border-t border-gray-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                style={{ accentColor: "#1E88E5" }}
              />
              <span className="text-sm text-gray-700 font-medium">Required field</span>
            </label>
          </div>

          {/* ── Visibility choice (Single Control: Client Picker Gated Behind Checkbox) ── */}
          <div className="pt-3 border-t border-gray-100 space-y-2.5">
            {selectedModule === "client" ? (
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restrictVisibility}
                    onChange={(e) => handleRestrictChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{ accentColor: "#1E88E5" }}
                  />
                  <span className="text-sm text-gray-700 font-semibold">
                    Restrict this field to specific clients
                  </span>
                </label>
                <p className="text-xs text-gray-400">
                  Leave unchecked to show for all clients automatically.
                </p>

                {restrictVisibility && (
                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 mt-2">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-200 bg-white">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={specificSearch}
                          onChange={e => setSpecificSearch(e.target.value)}
                          placeholder="Search clients by name or email…"
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                      {filteredClients.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                          {clientList.length === 0 ? "Loading clients…" : "No clients match"}
                        </p>
                      ) : (
                        filteredClients.map(c => {
                          const checked = selectedRecordIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRecord(c.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300"
                                style={{ accentColor: "#1E88E5" }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                                {c.email && (
                                  <p className="text-xs text-gray-400 truncate">{c.email}</p>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Selection count */}
                    {selectedRecordIds.length > 0 && (
                      <div className="px-3 py-1.5 border-t border-gray-200 bg-blue-50">
                        <p className="text-xs font-medium text-blue-700">
                          {selectedRecordIds.length} client{selectedRecordIds.length !== 1 ? "s" : ""} selected
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 leading-snug">
                  Specific-record visibility is currently only supported for Client fields.
                  This field will automatically show on all records of this module.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!newFieldName.trim()}
              onClick={handleCreateApply}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#1E88E5",
                cursor: newFieldName.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create Field
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface SelectFieldsModalProps {
  initiallySelected: string[];
  onClose: () => void;
  onApply: (keys: string[]) => void;
  onlyModules?: FieldModule[];
}

export function SelectFieldsModal({
  initiallySelected,
  onClose,
  onApply,
  onlyModules,
}: SelectFieldsModalProps) {
  const { getAllFields } = useFieldRegistry();
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFieldsForModal, setSelectedFieldsForModal] = useState<string[]>(() => initiallySelected);
  const [createFieldModalOpenFor, setCreateFieldModalOpenFor] = useState<FieldModule | null>(null);

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

  // Compile all fields grouped by module
  const groupedFieldsList = targetModules.map(module => {
    const fields = getAllFields(module).filter(f =>
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
                              <span className="text-xs font-semibold text-gray-700 truncate">{f.label}</span>
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
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSelectApply}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors"
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
