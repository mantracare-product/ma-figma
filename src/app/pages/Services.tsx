import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Search, Clock,
  ChevronDown, Check, MoreVertical, ToggleLeft, ToggleRight, Briefcase,
  Settings, Tag, X, Percent
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import DrawerShell from "../components/ui/DrawerShell";
import CPTCodeInput from "../components/ui/CPTCodeInput";
import { useFieldRegistry, ALL_MODULES, FieldDefinition } from "../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../components/help/FieldManager";
import { FieldInputRenderer } from "../components/fields/FieldInputRenderer";
import {
  Service, CURRENCIES, INIT_FORM, getCurrencySymbol,
  getStoredServices, addService, updateService, deleteService,
  toggleServiceActive, onServicesChanged,
} from "../../lib/servicesStore";
import { useTeamMembers } from "../../lib/teamStore";

// Re-export for any other file that imports Service from here
export type { Service };

const CATEGORIES_KEY = "ma_service_categories";

const DEFAULT_CATEGORIES = [
  "Consultation",
  "Dental",
  "Diagnostics",
  "Treatment",
  "Surgical",
  "General",
];

function getStoredCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...parsed]));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategoryToStore(catName: string) {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!parsed.includes(catName)) {
      parsed.push(catName);
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

export default function Services() {
  const [services, setServices] = useState<Service[]>(getStoredServices);
  const { teamMembers } = useTeamMembers();

  // Dynamic team members list
  const allTeamEmps = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return [];
    return teamMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role || m.department || "Staff",
      initials: m.name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "TM",
      email: m.email,
    }));
  }, [teamMembers]);

  // Keep in sync with changes made from other pages (e.g. ClientProfile)
  useEffect(() => {
    return onServicesChanged(() => setServices(getStoredServices()));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM, category: "General" });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // Row selection state
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  // Field registry for all modules
  const { getAllFields } = useFieldRegistry();
  const [showSelectFieldModal, setShowSelectFieldModal] = useState(false);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [serviceVisibleFieldKeys, setServiceVisibleFieldKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ma_service_visible_fields");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const HARDCODED_SERVICE_KEYS = new Set([
    "service_name",
    "name",
    "price",
    "duration",
    "currency",
    "category",
    "cptCode",
    "cpt_code",
    "service_code",
    "description",
    "tax",
    "assignedEmployees",
    "isActive",
  ]);

  const allAvailableFields = ALL_MODULES.flatMap((m) => getAllFields(m));

  const visibleCustomFields = serviceVisibleFieldKeys
    .filter((key) => !HARDCODED_SERVICE_KEYS.has(key))
    .map((key) => allAvailableFields.find((f) => f.key === key))
    .filter((f): f is FieldDefinition => Boolean(f));

  // Column visibility configuration state (Header Gear menu)
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    cptCode: true,
    category: true,
    duration: true,
    price: true,
    assignedStaff: true,
    created: true,
    activity: true,
    status: true,
  });

  // Category combobox state in drawer
  const [categoryList, setCategoryList] = useState<string[]>(getStoredCategories);
  const [catComboboxOpen, setCatComboboxOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const handleCreateAndSelectCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (!categoryList.includes(trimmed)) {
      const updated = [...categoryList, trimmed];
      setCategoryList(updated);
      saveCategoryToStore(trimmed);
    }
    setForm((prev) => ({ ...prev, category: trimmed }));
    setCatSearch("");
    setCatComboboxOpen(false);
    toast.success(`Category "${trimmed}" added and selected.`);
  };

  const filteredEmps = allTeamEmps.filter(
    (e) =>
      e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.role.toLowerCase().includes(empSearch.toLowerCase())
  );
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.cptCode && s.cptCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetForm = () => {
    setForm({ ...INIT_FORM, category: "General", cptCode: "", customFields: {} });
    setEmpSearch("");
    setShowEmpDrop(false);
    setCatSearch("");
    setCatComboboxOpen(false);
    setEditingService(null);
  };

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    if (!form.currency) { toast.error("Please select a currency"); return; }
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const s = addService({
      name: form.name.trim(),
      description: form.description,
      category: form.category || "General",
      cptCode: form.cptCode?.trim() || undefined,
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      tax: form.tax || 0,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
      createdAt: nowStr,
      activity: `Created ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      customFields: form.customFields,
    });
    setServices(getStoredServices());
    toast.success(`"${s.name}" added`);
    setShowAddDrawer(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!editingService || !form.name.trim()) { toast.error("Service name is required"); return; }
    if (!form.currency) { toast.error("Please select a currency"); return; }
    updateService(editingService.id, {
      name: form.name.trim(),
      description: form.description,
      category: form.category || "General",
      cptCode: form.cptCode?.trim() || undefined,
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      tax: form.tax || 0,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
      activity: `Updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      customFields: form.customFields,
    });
    setServices(getStoredServices());
    toast.success(`"${form.name}" updated`);
    setShowEditDrawer(false);
    resetForm();
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category || "General",
      cptCode: service.cptCode || "",
      duration: service.duration,
      price: service.price,
      currency: service.currency || "USD",
      tax: service.tax || 0,
      isActive: service.isActive,
      assignedEmployeeIds: service.assignedEmployees || [],
      customFields: service.customFields || {},
    });
    setShowEditDrawer(true);
    setOpenMenuId(null);
  };

  const handleDelete = (id: number, name: string) => {
    deleteService(id);
    setServices(getStoredServices());
    toast.success(`"${name}" deleted`);
    setOpenMenuId(null);
  };

  const handleToggleActive = (id: number) => {
    const s = services.find((sv) => sv.id === id);
    toggleServiceActive(id);
    setServices(getStoredServices());
    toast.success(`"${s?.name}" ${s?.isActive ? "deactivated" : "activated"}`);
    setOpenMenuId(null);
  };

  const toggleEmp = (id: number | string) =>
    setForm((f) => {
      const strId = String(id);
      const exists = f.assignedEmployeeIds.some((e) => String(e) === strId);
      return {
        ...f,
        assignedEmployeeIds: exists
          ? f.assignedEmployeeIds.filter((e) => String(e) !== strId)
          : [...f.assignedEmployeeIds, id],
      };
    });

  const toggleSelectAll = () => {
    if (selectedServiceIds.length === filteredServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(filteredServices.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderServiceForm = () => (
    <div className="space-y-5">
      {/* Service Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Service Name *
        </label>
        <input
          type="text"
          placeholder="e.g. Initial Consultation"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />
      </div>

      {/* Category (Searchable Combobox like Department in Team Profile) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Category
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCatComboboxOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-400 focus:outline-none transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <span className={form.category ? "text-gray-900 font-medium" : "text-gray-400"}>
              {form.category || "Select category..."}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${catComboboxOpen ? "rotate-180" : ""}`} />
          </button>

          {catComboboxOpen && (
            <div className="absolute z-[999] top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Search Input */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/50 relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Type or search category..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 p-1">
                {(() => {
                  const filtered = categoryList.filter((c) =>
                    c.toLowerCase().includes(catSearch.trim().toLowerCase())
                  );
                  const exactMatch = categoryList.some(
                    (c) => c.toLowerCase() === catSearch.trim().toLowerCase()
                  );

                  return (
                    <>
                      {filtered.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, category: cat }));
                            setCatSearch("");
                            setCatComboboxOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                            form.category === cat
                              ? "bg-blue-50 text-blue-900 font-bold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span>{cat}</span>
                          {form.category === cat && (
                            <Check className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </button>
                      ))}

                      {/* Add Button if Typed Category does NOT exist */}
                      {catSearch.trim() !== "" && !exactMatch && (
                        <button
                          type="button"
                          onClick={() => handleCreateAndSelectCategory(catSearch.trim())}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50/70 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors mt-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Add "{catSearch.trim()}" Category
                        </button>
                      )}

                      {filtered.length === 0 && exactMatch && (
                        <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                          No categories found
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CPT / Service Code (Optional for insurance & claim submission) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            CPT / Service Code <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <span className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>For insurance & claims</span>
        </div>
        <CPTCodeInput
          value={form.cptCode || ""}
          onChange={(code, suggestion) => {
            setForm((prev) => ({
              ...prev,
              cptCode: code,
              duration: (!prev.duration || prev.duration === 30) && suggestion?.typicalDuration ? suggestion.typicalDuration : prev.duration,
            }));
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Brief description..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Duration (min) *
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="number"
            min={5}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          />
        </div>
      </div>

      {/* Pricing & Currency */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Pricing & Currency *
        </label>
        <div className="flex gap-2">
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-32 px-2.5 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 bg-gray-50 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <option value="">Currency</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
              {form.currency ? getCurrencySymbol(form.currency) : "#"}
            </span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
        </div>
      </div>

      {/* Tax (%) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Tax (%)
        </label>
        <div className="relative">
          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 5"
            value={form.tax || ""}
            onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          />
        </div>
      </div>

      {/* Assigned Employees (Sleek Tag Chips like user's screenshot) */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
          Assigned Employees
        </label>
        {form.assignedEmployeeIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5 p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
            {form.assignedEmployeeIds.map((eid) => {
              const emp = allTeamEmps.find((e) => String(e.id) === String(eid));
              if (!emp) return null;
              return (
                <span
                  key={eid}
                  onClick={() => toggleEmp(eid)}
                  title="Click to remove"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span>{emp.name}</span>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                </span>
              );
            })}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmpDrop(!showEmpDrop)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm flex items-center justify-between focus:outline-none focus:border-blue-500 transition-all bg-white cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <span className="text-gray-400">
              {form.assignedEmployeeIds.length === 0
                ? "Select employees..."
                : `${form.assignedEmployeeIds.length} selected`}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEmpDrop ? "rotate-180" : ""}`} />
          </button>
          {showEmpDrop && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => { setShowEmpDrop(false); setEmpSearch(""); }} />
              <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-9 pl-9 pr-3 bg-transparent text-xs placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredEmps.map((emp) => {
                    const isSelected = form.assignedEmployeeIds.some((id) => String(id) === String(emp.id));
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleEmp(emp.id); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: "#1F2937" }}>
                          {emp.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {emp.role}
                          </p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredEmps.length === 0 && <p className="text-center text-xs text-gray-400 py-5">No employees found</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Switch */}
      <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
        <div>
          <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Active Service
          </p>
          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
            Available for scheduling and booking
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, isActive: !form.isActive })}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          {form.isActive ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-gray-400" />}
        </button>
      </div>

      {/* Dynamic / Selected Custom Fields */}
      {visibleCustomFields.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {visibleCustomFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>
              <FieldInputRenderer
                field={field}
                value={form.customFields?.[field.key] ?? field.defaultValue}
                onChange={(val) => setForm({
                  ...form,
                  customFields: { ...(form.customFields || {}), [field.key]: val }
                })}
                mode="runtime"
              />
            </div>
          ))}
        </div>
      )}

      {/* Select Field Modal Trigger Button */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowSelectFieldModal(true)}
            className="text-sm font-medium transition-colors cursor-pointer"
            style={{ color: "#4F8EF7", fontFamily: "Outfit, sans-serif", fontSize: "14px", borderBottom: "1px dashed #4F8EF7", paddingBottom: "2px" }}
          >
            Select field
          </button>
          <button
            type="button"
            onClick={() => setShowCreateFieldModal(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            + Create Field
          </button>
        </div>
      </div>
    </div>
  );

  const renderFooterBtns = (onSave: () => void, label: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-2 w-full justify-end">
      <button
        onClick={() => { setShowAddDrawer(false); setShowEditDrawer(false); resetForm(); }}
        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {icon}
        {label}
      </button>
    </div>
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredServices.length);
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Product / Services"
          subtitle="Define what you offer, how long it takes, and who is qualified to deliver it"
        >
          <div className="flex items-center gap-2">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Product/Services Works" />
          </div>
        </PageHeader>

        {/* Action / Search Toolbar powered by PageTopBar */}
        <PageTopBar
          isBottomPanelAttached={true}
          searchQuery={searchQuery}
          onSearchChange={(v) => {
            setSearchQuery(v);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search product/services..."
          filterPresets={[
            {
              id: "all",
              label: "All Services",
              count: services.length,
              isActive: !searchQuery,
              onClick: () => {
                setSearchQuery("");
                setCurrentPage(1);
              },
            },
            ...categoryList.slice(0, 4).map((cat) => ({
              id: cat.toLowerCase(),
              label: cat,
              count: services.filter((s) => s.category === cat).length,
              isActive: searchQuery.toLowerCase() === cat.toLowerCase(),
              onClick: () => {
                setSearchQuery(cat);
                setCurrentPage(1);
              },
            })),
          ]}
          filterFields={[
            {
              id: "name",
              label: "Service Name / Code",
              type: "text",
              placeholder: "Filter by name or CPT code...",
              value: searchQuery,
              onChange: (val) => {
                setSearchQuery(val || "");
                setCurrentPage(1);
              },
            },
            {
              id: "category",
              label: "Category",
              type: "select",
              value: searchQuery,
              onChange: (val) => {
                setSearchQuery(val === "all" ? "" : val || "");
                setCurrentPage(1);
              },
              options: [
                { label: "All Categories", value: "all" },
                ...categoryList.map((c) => ({ label: c, value: c })),
              ],
            },
          ]}
          primaryAction={{
            label: "Add Service",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => {
              resetForm();
              setShowAddDrawer(true);
            },
          }}
        />




        {/* Table View Connected with TableComponent */}
        {(() => {
          const serviceColumns: TableColumn<Service>[] = [
            {
              id: "name",
              header: "Product / Service",
              align: "left",
              render: (service) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-none bg-blue-50/80 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <Briefcase className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {service.name}
                      </h4>
                      {service.cptCode && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[9px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80 shrink-0">
                          CPT {service.cptCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: "cptCode",
              header: "CPT / Code",
              align: "center",
              render: (service) => (
                service.cptCode ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80">
                    {service.cptCode}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic font-sans">—</span>
                )
              ),
            },
            {
              id: "category",
              header: "Category",
              align: "center",
              render: (service) => (
                <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {service.category || "General"}
                </span>
              ),
            },
            {
              id: "duration",
              header: "Duration",
              align: "center",
              render: (service) => (
                <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {service.duration} min
                </span>
              ),
            },
            {
              id: "price",
              header: "Price",
              align: "center",
              render: (service) => (
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {getCurrencySymbol(service.currency)} {service.price}
                  </span>
                  {Boolean(service.tax && service.tax > 0) && (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.5 rounded-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      +{service.tax}%
                    </span>
                  )}
                </div>
              ),
            },
            {
              id: "assignedStaff",
              header: "Responsible",
              align: "center",
              render: (service) => {
                const assignedEmps = allTeamEmps.filter((e) =>
                  service.assignedEmployees?.some((id) => String(id) === String(e.id))
                );
                return assignedEmps.length > 0 ? (
                  <div className="flex flex-wrap gap-1 items-center justify-center">
                    {assignedEmps.map((emp) => (
                      <span
                        key={emp.id}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        {emp.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Unassigned
                  </span>
                );
              },
            },
            {
              id: "created",
              header: "Created",
              align: "center",
              render: (service) => (
                <span className="text-xs text-slate-600 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {service.createdAt || "2024-04-12"}
                </span>
              ),
            },
            {
              id: "activity",
              header: "Activity",
              align: "center",
              render: (service) => (
                <span className="text-xs text-slate-500 font-normal" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {service.activity || "Apr 12"}
                </span>
              ),
            },
            {
              id: "status",
              header: "Status",
              align: "center",
              render: (service) => (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    service.isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${service.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {service.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
          ];

          const serviceRowActions: TableRowAction<Service>[] = [
            {
              label: "Edit",
              icon: <Edit2 className="w-3.5 h-3.5" />,
              onClick: (service) => openEdit(service),
            },
            {
              label: "Toggle Status",
              icon: <ToggleLeft className="w-3.5 h-3.5" />,
              onClick: (service) => handleToggleActive(service.id),
            },
            {
              label: "Delete",
              icon: <Trash2 className="w-3.5 h-3.5" />,
              isDanger: true,
              onClick: (service) => handleDelete(service.id, service.name),
            },
          ];

          return (
            <TableComponent
              data={filteredServices}
              columns={serviceColumns}
              getRowId={(s) => s.id}
              rowActions={serviceRowActions}
              selectedIds={new Set(selectedServiceIds)}
              onSelectionChange={(ids) => setSelectedServiceIds(Array.from(ids) as number[])}
              defaultRowsPerPage={20}
              emptyMessage="No products or services found matching your filters."
            />
          );
        })()}
          </div>

        <DrawerShell
        isOpen={showAddDrawer}
        onClose={() => { setShowAddDrawer(false); resetForm(); }}
        title="Add New Service"
        subtitle="Define a service offering for your team"
        icon={<Plus className="w-4 h-4 text-blue-600" />}
        width="max-w-lg"
        zIndex={600}
        footer={renderFooterBtns(handleAdd, "Add Service", <Plus className="w-4 h-4" />)}
      >
        {renderServiceForm()}
      </DrawerShell>

      <DrawerShell
        isOpen={showEditDrawer}
        onClose={() => { setShowEditDrawer(false); resetForm(); }}
        title="Edit Service"
        subtitle={editingService?.name}
        icon={<Edit2 className="w-4 h-4 text-blue-600" />}
        width="max-w-lg"
        zIndex={600}
        footer={renderFooterBtns(handleEdit, "Save Changes", <Check className="w-4 h-4" />)}
      >
        {renderServiceForm()}
      </DrawerShell>

      {/* Select Field Modal — shows all available system fields and custom fields across all modules */}
      {showSelectFieldModal && (
        <SelectFieldsModal
          initiallySelected={serviceVisibleFieldKeys}
          onClose={() => setShowSelectFieldModal(false)}
          onApply={(keys) => {
            setServiceVisibleFieldKeys(keys);
            try {
              localStorage.setItem("ma_service_visible_fields", JSON.stringify(keys));
            } catch {}
          }}
        />
      )}

      {/* Create Field Modal */}
      {showCreateFieldModal && (
        <CreateFieldModal
          onClose={() => setShowCreateFieldModal(false)}
          onCreated={(field) => {
            setServiceVisibleFieldKeys((prev) => {
              const next = prev.includes(field.key) ? prev : [...prev, field.key];
              try {
                localStorage.setItem("ma_service_visible_fields", JSON.stringify(next));
              } catch {}
              return next;
            });
          }}
        />
      )}

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Product/Services Works"
        summary="Product/Services are the offerings your team delivers. Define each offering's name, duration, price, and currency, then assign the staff members who provide it."
        bullets={[
          "Create and manage product/services",
          "Set duration, price, and currency for each offering",
          "Assign one or more team members per item",
          "Toggle items active/inactive without deleting them",
        ]}
        guideUrl="/guide/services"
      />
    </div>
  );
}
