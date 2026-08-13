import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Search, Clock,
  ChevronDown, Check, MoreVertical, ToggleLeft, ToggleRight, Briefcase,
  Settings, Tag, X, Percent
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import DrawerShell from "../components/ui/DrawerShell";
import {
  Service, EMPLOYEES, CURRENCIES, INIT_FORM, getCurrencySymbol,
  getStoredServices, addService, updateService, deleteService,
  toggleServiceActive, onServicesChanged,
} from "../../lib/servicesStore";

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

  // Column visibility configuration state (Header Gear menu)
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
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

  const filteredEmps = EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase())
  );
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetForm = () => {
    setForm({ ...INIT_FORM, category: "General" });
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
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      tax: form.tax || 0,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
      createdAt: nowStr,
      activity: `Created ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      tax: form.tax || 0,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
      activity: `Updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
      duration: service.duration,
      price: service.price,
      currency: service.currency || "USD",
      tax: service.tax || 0,
      isActive: service.isActive,
      assignedEmployeeIds: service.assignedEmployees || [],
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

  const toggleEmp = (id: number) =>
    setForm((f) => ({
      ...f,
      assignedEmployeeIds: f.assignedEmployeeIds.includes(id)
        ? f.assignedEmployeeIds.filter((e) => e !== id)
        : [...f.assignedEmployeeIds, id],
    }));

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

  const ServiceForm = () => (
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
              const emp = EMPLOYEES.find((e) => e.id === eid);
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
                  {filteredEmps.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleEmp(emp.id); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                        form.assignedEmployeeIds.includes(emp.id) ? "bg-blue-50" : "hover:bg-gray-50"
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
                      {form.assignedEmployeeIds.includes(emp.id) && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </button>
                  ))}
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
    </div>
  );

  const FooterBtns = ({ onSave, label, icon }: { onSave: () => void; label: string; icon: React.ReactNode }) => (
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-7">
        <PageHeader title="Product/Services" subtitle="Define what you offer, how long it takes, and who is qualified to deliver it">
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Product/Services Works" />
        </PageHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search product/services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowAddDrawer(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {/* Improved Table View without capsule shapes, hamburger menu icon column under gear */}
        {filteredServices.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead style={{ backgroundColor: "#314158" }}>
                  <tr className="border-b border-slate-700">
                    {/* Checkbox Column */}
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.length === filteredServices.length && filteredServices.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>

                    {/* Column Configuration Gear Button Column */}
                    <th className="py-3 px-2 text-center relative" style={{ width: "32px" }}>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowColumnSettings((v) => !v)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-white/10"
                          title="Configure Visible Columns"
                        >
                          <Settings className="w-4 h-4 text-slate-200 hover:text-white transition-colors" />
                        </button>

                        {/* Visible Columns Popover */}
                        {showColumnSettings && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowColumnSettings(false)} />
                            <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 text-left" style={{ fontFamily: "Outfit, sans-serif" }}>
                              <div className="text-[11px] font-bold text-slate-500 uppercase px-2 py-1 mb-1 border-b border-slate-100">
                                Visible Columns
                              </div>
                              <div className="space-y-1 text-xs text-slate-700">
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.category}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, category: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Category</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.duration}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, duration: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Duration</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.price}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, price: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Price</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.assignedStaff}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, assignedStaff: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Responsible</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.created}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, created: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Created</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.activity}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, activity: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Activity</span>
                                </label>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.status}
                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, status: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600"
                                  />
                                  <span>Status</span>
                                </label>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </th>

                    {/* Standard Headers without ACTIONS column header on the right */}
                    <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Product / Service
                    </th>
                    {visibleColumns.category && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Category
                      </th>
                    )}
                    {visibleColumns.duration && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Duration
                      </th>
                    )}
                    {visibleColumns.price && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Price
                      </th>
                    )}
                    {visibleColumns.assignedStaff && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Responsible
                      </th>
                    )}
                    {visibleColumns.created && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Created
                      </th>
                    )}
                    {visibleColumns.activity && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Activity
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredServices.map((service) => {
                    const assignedEmps = EMPLOYEES.filter((e) => service.assignedEmployees?.includes(e.id));
                    const isSelected = selectedServiceIds.includes(service.id);

                    return (
                      <tr key={service.id} className={`hover:bg-gray-50/80 transition-colors group ${isSelected ? "bg-blue-50/40" : ""}`}>
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(service.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Hamburger Action Menu Column directly under the Gear button */}
                        <td className="py-3 px-2 text-center relative" style={{ width: "32px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === service.id ? null : service.id);
                            }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Row Actions Menu Popover */}
                          {openMenuId === service.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div
                                className="absolute left-full top-0 ml-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[165px] text-left animate-in fade-in-50 zoom-in-95 duration-100"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                <button
                                  onClick={() => openEdit(service)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Edit
                                </button>
                                <button
                                  onClick={() => handleToggleActive(service.id)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  {service.isActive ? (
                                    <>
                                      <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="w-3.5 h-3.5 text-blue-600" /> Activate
                                    </>
                                  )}
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleDelete(service.id, service.name)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>

                        {/* Service Icon, Name & Description */}
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {service.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {service.description || "No description provided"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category (Clean text without heavy capsule container) */}
                        {visibleColumns.category && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {service.category || "General"}
                            </span>
                          </td>
                        )}

                        {/* Duration (Clean text) */}
                        {visibleColumns.duration && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {service.duration} min
                            </span>
                          </td>
                        )}

                        {/* Price & Tax */}
                        {visibleColumns.price && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                {getCurrencySymbol(service.currency)} {service.price}
                              </span>
                              {Boolean(service.tax && service.tax > 0) && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  +{service.tax}% tax
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Responsible / Assigned Staff (Showing Full Employee Names as Chips matching user's screenshot 2) */}
                        {visibleColumns.assignedStaff && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {assignedEmps.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {assignedEmps.map((emp) => (
                                  <span
                                    key={emp.id}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    {emp.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Unassigned
                              </span>
                            )}
                          </td>
                        )}

                        {/* Created Date */}
                        {visibleColumns.created && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-xs text-slate-600 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {service.createdAt || "2024-04-12 10:00"}
                            </span>
                          </td>
                        )}

                        {/* Activity */}
                        {visibleColumns.activity && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-xs text-slate-500 font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {service.activity || "Last updated Apr 12"}
                            </span>
                          </td>
                        )}

                        {/* Status (Clean text badge without capsule container) */}
                        {visibleColumns.status && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                service.isActive ? "text-emerald-600" : "text-slate-400"
                              }`}
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span className={`w-2 h-2 rounded-full ${service.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                              {service.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {searchQuery ? "No services match your search" : "No services yet"}
            </h3>
            <p className="text-sm text-gray-500 mb-5" style={{ fontFamily: "Outfit, sans-serif" }}>
              {searchQuery ? "Try a different keyword" : "Add your first service to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { resetForm(); setShowAddDrawer(true); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            )}
          </div>
        )}
      </div>

      <DrawerShell
        isOpen={showAddDrawer}
        onClose={() => { setShowAddDrawer(false); resetForm(); }}
        title="Add New Service"
        subtitle="Define a service offering for your team"
        icon={<Plus className="w-4 h-4 text-blue-600" />}
        width="max-w-lg"
        zIndex={600}
        footer={<FooterBtns onSave={handleAdd} label="Add Service" icon={<Plus className="w-4 h-4" />} />}
      >
        <ServiceForm />
      </DrawerShell>

      <DrawerShell
        isOpen={showEditDrawer}
        onClose={() => { setShowEditDrawer(false); resetForm(); }}
        title="Edit Service"
        subtitle={editingService?.name}
        icon={<Edit2 className="w-4 h-4 text-blue-600" />}
        width="max-w-lg"
        zIndex={600}
        footer={<FooterBtns onSave={handleEdit} label="Save Changes" icon={<Check className="w-4 h-4" />} />}
      >
        <ServiceForm />
      </DrawerShell>

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
