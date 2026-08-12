import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Search, Clock,
  ChevronDown, Check, MoreVertical, ToggleLeft, ToggleRight, Briefcase,
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
  const [form, setForm] = useState({ ...INIT_FORM });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  const filteredEmps = EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase())
  );
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setForm({ ...INIT_FORM });
    setEmpSearch("");
    setShowEmpDrop(false);
    setEditingService(null);
  };

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    if (!form.currency) { toast.error("Please select a currency"); return; }
    const s = addService({
      name: form.name.trim(),
      description: form.description,
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
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
      duration: form.duration,
      price: form.price,
      currency: form.currency,
      isActive: form.isActive,
      assignedEmployees: form.assignedEmployeeIds,
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
      duration: service.duration,
      price: service.price,
      currency: service.currency || "USD",
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

  const ServiceForm = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Service Name *</label>
        <input type="text" placeholder="e.g. Initial Consultation" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Description</label>
        <textarea rows={3} placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none" style={{ fontFamily: "DM Sans, sans-serif" }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Duration (min) *</label>
          <div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} /></div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Pricing & Currency *</label>
          <div className="flex gap-2">
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-28 px-2.5 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 bg-gray-50 focus:outline-none focus:border-blue-500 transition-all cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}>
              <option value="">Currency</option>
              {CURRENCIES.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}
            </select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">{form.currency ? getCurrencySymbol(form.currency) : "#"}</span>
              <input type="number" min={0} placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" style={{ fontFamily: "DM Sans, sans-serif" }} />
            </div>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>Assigned Employees</label>
        {form.assignedEmployeeIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.assignedEmployeeIds.map((eid) => { const emp = EMPLOYEES.find((e) => e.id === eid); if (!emp) return null; return (
              <span key={eid} onClick={() => toggleEmp(eid)} title="Click to remove" className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "#1F2937", fontFamily: "Outfit, sans-serif" }}>{emp.initials} <span className="opacity-70">x</span></span>
            ); })}
          </div>
        )}
        <div className="relative">
          <button type="button" onClick={() => setShowEmpDrop(!showEmpDrop)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm flex items-center justify-between focus:outline-none focus:border-blue-500 transition-all bg-white cursor-pointer" style={{ fontFamily: "DM Sans, sans-serif" }}>
            <span className="text-gray-400">{form.assignedEmployeeIds.length === 0 ? "Select employees..." : `${form.assignedEmployeeIds.length} selected`}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEmpDrop ? "rotate-180" : ""}`} />
          </button>
          {showEmpDrop && (<>
            <div className="fixed inset-0 z-[5]" onClick={() => { setShowEmpDrop(false); setEmpSearch(""); }} />
            <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><input type="text" placeholder="Search..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full h-9 pl-9 pr-3 bg-transparent text-xs placeholder:text-gray-400 focus:outline-none" /></div></div>
              <div className="max-h-48 overflow-y-auto">
                {filteredEmps.map((emp) => (
                  <button key={emp.id} type="button" onClick={(e) => { e.stopPropagation(); toggleEmp(emp.id); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${form.assignedEmployeeIds.includes(emp.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: "#1F2937" }}>{emp.initials}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{emp.name}</p><p className="text-[11px] text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>{emp.role}</p></div>
                    {form.assignedEmployeeIds.includes(emp.id) && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
                {filteredEmps.length === 0 && <p className="text-center text-xs text-gray-400 py-5">No employees found</p>}
              </div>
            </div>
          </>)}
        </div>
      </div>
      <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
        <div><p className="text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>Active Service</p><p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>Available for scheduling and booking</p></div>
        <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className="cursor-pointer hover:opacity-80 transition-opacity">{form.isActive ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-gray-400" />}</button>
      </div>
    </div>
  );

  const FooterBtns = ({ onSave, label, icon }: { onSave: () => void; label: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2 w-full justify-end">
      <button onClick={() => { setShowAddDrawer(false); setShowEditDrawer(false); resetForm(); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}>Cancel</button>
      <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs" style={{ fontFamily: "Outfit, sans-serif" }}>{icon}{label}</button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-7">
        <PageHeader title="Products & Services" subtitle="Define what you offer, how long it takes, and who is qualified to deliver it">
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Products & Services Works" />
        </PageHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs" style={{ fontFamily: "DM Sans, sans-serif" }} />
          </div>
          <button onClick={() => { resetForm(); setShowAddDrawer(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}>
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {/* Table View */}
        {filteredServices.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead style={{ backgroundColor: "#1F2937" }}>
                  <tr className="border-b border-gray-700">
                    <th className="py-3.5 px-5 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Service</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Duration</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Price</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Assigned Staff</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>Status</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider text-right" style={{ fontFamily: "Outfit, sans-serif" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredServices.map((service) => {
                    const assignedEmps = EMPLOYEES.filter((e) => service.assignedEmployees?.includes(e.id));
                    return (
                      <tr key={service.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-5 min-w-[240px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600"><Briefcase className="w-4 h-4" /></div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{service.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{service.description || "No description provided"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>{service.duration} min</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                            <span className="text-xs font-bold text-gray-600">{getCurrencySymbol(service.currency)}</span>
                            <span className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>{service.price}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {assignedEmps.length > 0 ? (
                            <div className="flex -space-x-1.5 items-center">
                              {assignedEmps.slice(0, 4).map((emp) => (
                                <div key={emp.id} title={emp.name} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-xs cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: "#1F2937" }}>{emp.initials}</div>
                              ))}
                              {assignedEmps.length > 4 && <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-bold shadow-xs">+{assignedEmps.length - 4}</div>}
                            </div>
                          ) : <span className="text-xs text-gray-400 italic" style={{ fontFamily: "Outfit, sans-serif" }}>Unassigned</span>}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${service.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${service.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {service.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="relative inline-block text-left">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === service.id ? null : service.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === service.id && (<>
                              <div className="fixed inset-0 z-[5]" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-9 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px] text-left" style={{ fontFamily: "Outfit, sans-serif" }}>
                                <button onClick={() => openEdit(service)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"><Edit2 className="w-3.5 h-3.5 text-gray-400" /> Edit Service</button>
                                <button onClick={() => handleToggleActive(service.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">{service.isActive ? <><ToggleLeft className="w-3.5 h-3.5 text-gray-400" /> Deactivate</> : <><ToggleRight className="w-3.5 h-3.5 text-blue-500" /> Activate</>}</button>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => handleDelete(service.id, service.name)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                              </div>
                            </>)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Briefcase className="w-8 h-8 text-gray-400" /></div>
            <h3 className="text-base font-bold text-gray-800 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>{searchQuery ? "No services match your search" : "No services yet"}</h3>
            <p className="text-sm text-gray-500 mb-5" style={{ fontFamily: "Outfit, sans-serif" }}>{searchQuery ? "Try a different keyword" : "Add your first service to get started"}</p>
            {!searchQuery && <button onClick={() => { resetForm(); setShowAddDrawer(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}><Plus className="w-4 h-4" /> Add Service</button>}
          </div>
        )}
      </div>

      <DrawerShell isOpen={showAddDrawer} onClose={() => { setShowAddDrawer(false); resetForm(); }} title="Add New Service" subtitle="Define a service offering for your team" icon={<Plus className="w-4 h-4 text-blue-600" />} width="max-w-lg" zIndex={600} footer={<FooterBtns onSave={handleAdd} label="Add Service" icon={<Plus className="w-4 h-4" />} />}>
        <ServiceForm />
      </DrawerShell>

      <DrawerShell isOpen={showEditDrawer} onClose={() => { setShowEditDrawer(false); resetForm(); }} title="Edit Service" subtitle={editingService?.name} icon={<Edit2 className="w-4 h-4 text-blue-600" />} width="max-w-lg" zIndex={600} footer={<FooterBtns onSave={handleEdit} label="Save Changes" icon={<Check className="w-4 h-4" />} />}>
        <ServiceForm />
      </DrawerShell>

      <HowItWorksModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="How Products & Services Works" summary="Products & Services are the offerings your team delivers. Define each offering's name, duration, price, and currency, then assign the staff members who provide it." bullets={["Create and manage products & services", "Set duration, price, and currency for each offering", "Assign one or more team members per item", "Toggle items active/inactive without deleting them"]} guideUrl="/guide/services" />
    </div>
  );
}
