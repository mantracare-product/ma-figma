import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Search, Clock,
  ChevronDown, Check, MoreVertical, ToggleLeft, ToggleRight, Briefcase,
  Settings, Tag, X, Percent, Layers, GripVertical, Building2, MapPin, Navigation
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { DataExportModal } from "../components/common/DataExportModal";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import DrawerShell from "../components/ui/DrawerShell";
import DraggableOverviewSections, { OverviewSection } from "../components/profile/DraggableOverviewSections";
import CPTCodeInput from "../components/ui/CPTCodeInput";
import { AdminSelect } from "../components/ui/AdminSelect";
import { useFieldRegistry, ALL_MODULES, FieldDefinition } from "../context/FieldRegistryContext";
import { SelectFieldsModal } from "../components/help/FieldManager";
import { AdminSectionDrawer } from "./admin/components/AdminSectionDrawer";
import {
  Service, CURRENCIES, INIT_FORM, getCurrencySymbol,
  getStoredServices, addService, updateService, deleteService,
  toggleServiceActive, onServicesChanged,
} from "../../lib/servicesStore";
import { useTeamMembers } from "../../lib/teamStore";
import { useOrganization } from "../context/OrganizationContext";
import {
  Room, getStoredRooms, addRoom, updateRoom, deleteRoom, onRoomsChanged
} from "../../lib/roomsStore";

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...INIT_FORM, category: "General" });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // ── Rooms Tab State & Handlers ──
  const [activeMainTab, setActiveMainTab] = useState<"services" | "rooms">("services");
  const [rooms, setRooms] = useState<Room[]>(getStoredRooms);
  const { activeOrganization } = useOrganization();

  useEffect(() => {
    return onRoomsChanged(() => setRooms(getStoredRooms()));
  }, []);

  const orgLocations = useMemo(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any) => l.name);
        }
      }
    } catch {}
    return activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];
  }, [activeOrganization]);

  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [roomLocationFilter, setRoomLocationFilter] = useState("all");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [showAddRoomDrawer, setShowAddRoomDrawer] = useState(false);
  const [showEditRoomDrawer, setShowEditRoomDrawer] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    name: "",
    direction: "",
    location: "California",
    serviceId: "",
    responsibleId: "",
    isActive: true,
  });

  const resetRoomForm = () => {
    setRoomForm({
      roomNumber: "",
      name: "",
      direction: "",
      location: orgLocations[0] || "California",
      serviceId: "",
      responsibleId: "",
      isActive: true,
    });
    setEditingRoom(null);
  };

  const openAddRoom = () => {
    resetRoomForm();
    setShowAddRoomDrawer(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      roomNumber: room.roomNumber,
      name: room.name,
      direction: room.direction || "",
      location: room.location || orgLocations[0] || "California",
      serviceId: room.serviceId !== undefined ? String(room.serviceId) : "",
      responsibleId: room.responsibleId !== undefined ? String(room.responsibleId) : "",
      isActive: room.isActive !== false,
    });
    setShowEditRoomDrawer(true);
  };

  const handleSaveRoom = (isEdit: boolean) => {
    if (!roomForm.roomNumber.trim() || !roomForm.name.trim()) {
      toast.error("Please provide both Room Number and Room Name");
      return;
    }

    const matchedService = services.find((s) => String(s.id) === String(roomForm.serviceId));
    const matchedEmp = allTeamEmps.find((e) => String(e.id) === String(roomForm.responsibleId));

    if (isEdit && editingRoom) {
      updateRoom(editingRoom.id, {
        roomNumber: roomForm.roomNumber.trim(),
        name: roomForm.name.trim(),
        direction: roomForm.direction.trim(),
        location: roomForm.location,
        serviceId: roomForm.serviceId ? roomForm.serviceId : undefined,
        serviceName: matchedService ? matchedService.name : undefined,
        responsibleId: roomForm.responsibleId ? roomForm.responsibleId : undefined,
        responsibleName: matchedEmp ? matchedEmp.name : undefined,
        isActive: roomForm.isActive,
      });
      toast.success(`Room ${roomForm.roomNumber} updated successfully`);
      setShowEditRoomDrawer(false);
    } else {
      addRoom({
        roomNumber: roomForm.roomNumber.trim(),
        name: roomForm.name.trim(),
        direction: roomForm.direction.trim(),
        location: roomForm.location,
        serviceId: roomForm.serviceId ? roomForm.serviceId : undefined,
        serviceName: matchedService ? matchedService.name : undefined,
        responsibleId: roomForm.responsibleId ? roomForm.responsibleId : undefined,
        responsibleName: matchedEmp ? matchedEmp.name : undefined,
        isActive: roomForm.isActive,
      });
      toast.success(`Room ${roomForm.roomNumber} added successfully`);
      setShowAddRoomDrawer(false);
    }
    setRooms(getStoredRooms());
    resetRoomForm();
  };

  const handleDeleteRoom = (id: string, name: string) => {
    deleteRoom(id);
    setRooms(getStoredRooms());
    toast.success(`Room "${name}" deleted`);
  };

  const handleToggleRoomActive = (id: string) => {
    const rm = rooms.find((r) => r.id === id);
    if (!rm) return;
    updateRoom(id, { isActive: !rm.isActive });
    setRooms(getStoredRooms());
    toast.success(`Room ${rm.roomNumber} marked ${!rm.isActive ? "active" : "inactive"}`);
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = roomSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.roomNumber.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.direction && r.direction.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.serviceName && r.serviceName.toLowerCase().includes(q)) ||
        (r.responsibleName && r.responsibleName.toLowerCase().includes(q));

      const matchLoc =
        roomLocationFilter === "all" ||
        (r.location && r.location.toLowerCase() === roomLocationFilter.toLowerCase());

      return matchQuery && matchLoc;
    });
  }, [rooms, roomSearchQuery, roomLocationFilter]);

  // Row selection state
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  // Field registry for all modules
  const {
    getAllFields,
    getAllSections,
    assignFieldToSection,
    deleteCustomSection,
  } = useFieldRegistry();

  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);
  const [addSectionDrawerOpen, setAddSectionDrawerOpen] = useState(false);

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

  const allServiceSections = getAllSections("service");

  const handleOpenSelectFieldForSection = (sectionId: string) => {
    setTargetSectionIdForField(sectionId);
    setFieldModalOpen(true);
  };

  const handleApplySelectedFields = (selectedKeys: string[]) => {
    if (!targetSectionIdForField) return;
    selectedKeys.forEach((key) => {
      assignFieldToSection("service", targetSectionIdForField, key);
    });
    setServiceVisibleFieldKeys((prev) => Array.from(new Set([...prev, ...selectedKeys])));
    setFieldModalOpen(false);
    setTargetSectionIdForField(null);
    toast.success("Fields updated in section");
  };

  // Column visibility configuration state (Header Gear menu)
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    cptCode: true,
    category: true,
    duration: true,
    price: true,
    tax: true,
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

  const CANONICAL_SERVICE_SECTIONS: OverviewSection[] = useMemo(() => [
    {
      id: "sec-service-info",
      title: "Service Details",
      fieldKeys: ["name", "category", "cptCode", "description"],
    },
    {
      id: "sec-service-pricing",
      title: "Pricing & Duration",
      fieldKeys: ["duration", "price", "tax"],
    },
    {
      id: "sec-service-assignment",
      title: "Staff & Availability",
      fieldKeys: ["assignedEmployees", "isActive"],
    },
  ], []);

  const [serviceSections, setServiceSections] = useState<OverviewSection[]>(CANONICAL_SERVICE_SECTIONS);

  // Sync with registry sections
  useEffect(() => {
    try {
      const regSections = getAllSections("service");
      if (regSections && regSections.length > 0) {
        setServiceSections((prev) => {
          const map = new Map<string, OverviewSection>();
          CANONICAL_SERVICE_SECTIONS.forEach((s) => map.set(s.id, s));
          regSections.forEach((rs) => {
            const existing = map.get(rs.id);
            if (existing) {
              map.set(rs.id, {
                ...existing,
                title: rs.title || existing.title,
                fieldKeys: Array.from(new Set([...existing.fieldKeys, ...(rs.fieldKeys || [])])),
              });
            } else {
              map.set(rs.id, {
                id: rs.id,
                title: rs.title,
                description: rs.description,
                isCustom: rs.source !== "system",
                fieldKeys: rs.fieldKeys || [],
              });
            }
          });
          return Array.from(map.values());
        });
      }
    } catch {}
  }, [allServiceSections]);

  const [fieldValues, setFieldValues] = useState<Record<string, any>>({
    name: "",
    category: "General",
    cptCode: "",
    description: "",
    duration: 30,
    price: 0,
    tax: 0,
    isActive: true,
    assignedEmployees: [],
  });

  const resetForm = () => {
    setFieldValues({
      name: "",
      category: "General",
      cptCode: "",
      description: "",
      duration: 30,
      price: 0,
      tax: 0,
      isActive: true,
      assignedEmployees: [],
    });
    setEditingService(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddDrawer(true);
  };

  const handleAdd = () => {
    const name = String(fieldValues["name"] || "").trim();
    if (!name) { toast.error("Service name is required"); return; }
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const SYSTEM_KEYS = new Set(["name", "category", "cptCode", "description", "duration", "price", "tax", "isActive", "assignedEmployees"]);
    const customFields: Record<string, any> = {};
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (!SYSTEM_KEYS.has(k)) {
        customFields[k] = v;
      }
    });

    const s = addService({
      name,
      description: String(fieldValues["description"] || ""),
      category: String(fieldValues["category"] || "General"),
      cptCode: String(fieldValues["cptCode"] || "").trim() || undefined,
      duration: Number(fieldValues["duration"]) || 30,
      price: Number(fieldValues["price"]) || 0,
      currency: "USD",
      tax: Number(fieldValues["tax"]) || 0,
      isActive: fieldValues["isActive"] !== false,
      assignedEmployees: Array.isArray(fieldValues["assignedEmployees"]) ? fieldValues["assignedEmployees"] : [],
      createdAt: nowStr,
      activity: `Created ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      customFields,
    });
    setServices(getStoredServices());
    toast.success(`"${s.name}" added`);
    setShowAddDrawer(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!editingService) return;
    const name = String(fieldValues["name"] || "").trim();
    if (!name) { toast.error("Service name is required"); return; }
    const SYSTEM_KEYS = new Set(["name", "category", "cptCode", "description", "duration", "price", "tax", "isActive", "assignedEmployees"]);
    const customFields: Record<string, any> = {};
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (!SYSTEM_KEYS.has(k)) {
        customFields[k] = v;
      }
    });

    updateService(editingService.id, {
      name,
      description: String(fieldValues["description"] || ""),
      category: String(fieldValues["category"] || "General"),
      cptCode: String(fieldValues["cptCode"] || "").trim() || undefined,
      duration: Number(fieldValues["duration"]) || 30,
      price: Number(fieldValues["price"]) || 0,
      currency: "USD",
      tax: Number(fieldValues["tax"]) || 0,
      isActive: fieldValues["isActive"] !== false,
      assignedEmployees: Array.isArray(fieldValues["assignedEmployees"]) ? fieldValues["assignedEmployees"] : [],
      activity: `Updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      customFields,
    });
    setServices(getStoredServices());
    toast.success(`"${name}" updated`);
    setShowEditDrawer(false);
    resetForm();
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFieldValues({
      name: service.name || "",
      category: service.category || "General",
      cptCode: service.cptCode || "",
      description: service.description || "",
      duration: service.duration ?? 30,
      price: service.price ?? 0,
      tax: service.tax ?? 0,
      isActive: service.isActive !== false,
      assignedEmployees: service.assignedEmployees || [],
      ...(service.customFields || {}),
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

        {activeMainTab === "services" ? (
          <>
            {/* Action / Search Toolbar powered by PageTopBar */}
            <PageTopBar
              isBottomPanelAttached={true}
              modes={[
                { id: "services", label: "Products & Services", badge: services.length },
                { id: "rooms", label: "Rooms", badge: rooms.length },
              ]}
              activeMode={activeMainTab}
              onModeChange={(m) => setActiveMainTab(m as "services" | "rooms")}
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
              onExport={() => setShowExportModal(true)}
              primaryAction={{
                label: "Add Product",
                icon: <Plus className="w-4 h-4" />,
                onClick: openAdd,
              }}
            />

            {/* Unified DataExportModal */}
            <DataExportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              title="Export Products & Services"
              subtitle="Export catalog items, pricing, CPT codes, and categories"
              data={services}
              filenamePrefix="products_services"
              allFields={[
                { key: "name", label: "Product / Service Name", getValue: (s) => s.name },
                { key: "category", label: "Category", getValue: (s) => s.category },
                { key: "price", label: "Price", getValue: (s) => `${getCurrencySymbol(s.currency)}${s.price.toFixed(2)}` },
                { key: "duration", label: "Duration (mins)", getValue: (s) => `${s.duration} mins` },
                { key: "cptCode", label: "CPT Code", getValue: (s) => s.cptCode || "" },
                { key: "description", label: "Description", getValue: (s) => s.description || "" },
                { key: "tax", label: "Tax (%)", getValue: (s) => (s.tax ? `${s.tax}%` : "0%") },
                { key: "active", label: "Status", getValue: (s) => (s.isActive !== false ? "Active" : "Inactive") },
                { key: "color", label: "Color Tag", getValue: (s) => s.color || "" },
              ]}
            />

            {/* Table View Connected with TableComponent */}
            {(() => {
              const serviceColumns: TableColumn<Service>[] = [
                {
                  id: "name",
                  header: "Product / Service",
                  align: "left",
                  render: (service) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(service);
                      }}
                      className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate cursor-pointer"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {service.name}
                    </button>
                  ),
                },
                {
                  id: "cptCode",
                  header: "CPT / Code",
                  align: "left",
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
                  align: "left",
                  render: (service) => (
                    <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {service.category || "General"}
                    </span>
                  ),
                },
                {
                  id: "duration",
                  header: "Duration",
                  align: "left",
                  render: (service) => (
                    <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {service.duration} min
                    </span>
                  ),
                },
                {
                  id: "price",
                  header: "Price",
                  align: "left",
                  render: (service) => (
                    <span className="text-xs font-bold text-slate-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {getCurrencySymbol(service.currency)} {service.price}
                    </span>
                  ),
                },
                {
                  id: "tax",
                  header: "Tax",
                  align: "left",
                  render: (service) => (
                    Boolean(service.tax && service.tax > 0) ? (
                      <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {service.tax}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-sans">—</span>
                    )
                  ),
                },
                {
                  id: "assignedStaff",
                  header: "Responsible",
                  align: "left",
                  render: (service) => {
                    const assignedEmps = allTeamEmps.filter((e) =>
                      service.assignedEmployees?.some((id) => String(id) === String(e.id))
                    );
                    return assignedEmps.length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
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
                  align: "left",
                  render: (service) => (
                    <span className="text-xs text-slate-600 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {service.createdAt || "2024-04-12"}
                    </span>
                  ),
                },
                {
                  id: "activity",
                  header: "Activity",
                  align: "left",
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
                  onRowClick={(service) => openEdit(service)}
                  defaultRowsPerPage={20}
                  emptyMessage="No products or services found matching your filters."
                />
              );
            })()}
          </>
        ) : (
          <>
            {/* Rooms Toolbar powered by PageTopBar */}
            <PageTopBar
              isBottomPanelAttached={true}
              modes={[
                { id: "services", label: "Products & Services", badge: services.length },
                { id: "rooms", label: "Rooms", badge: rooms.length },
              ]}
              activeMode={activeMainTab}
              onModeChange={(m) => setActiveMainTab(m as "services" | "rooms")}
              searchQuery={roomSearchQuery}
              onSearchChange={setRoomSearchQuery}
              searchPlaceholder="Search rooms (room #, name, location, guidance)..."
              filterPresets={[
                {
                  id: "all",
                  label: "All Rooms",
                  count: rooms.length,
                  isActive: roomLocationFilter === "all",
                  onClick: () => setRoomLocationFilter("all"),
                },
                ...orgLocations.map((loc) => ({
                  id: loc.toLowerCase(),
                  label: loc,
                  count: rooms.filter((r) => r.location?.toLowerCase() === loc.toLowerCase()).length,
                  isActive: roomLocationFilter.toLowerCase() === loc.toLowerCase(),
                  onClick: () => setRoomLocationFilter(loc),
                })),
              ]}
              filterFields={[
                {
                  id: "location",
                  label: "Location",
                  type: "select",
                  value: roomLocationFilter,
                  onChange: (val) => setRoomLocationFilter(val || "all"),
                  options: [
                    { label: "All Locations", value: "all" },
                    ...orgLocations.map((loc) => ({ label: loc, value: loc })),
                  ],
                },
              ]}
              primaryAction={{
                label: "Add Room",
                icon: <Plus className="w-4 h-4" />,
                onClick: openAddRoom,
              }}
            />

            {/* Table View for Rooms with TableComponent */}
            {(() => {
              const roomColumns: TableColumn<Room>[] = [
                {
                  id: "roomNumber",
                  header: "Room #",
                  align: "left",
                  render: (room) => (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      #{room.roomNumber}
                    </span>
                  ),
                },
                {
                  id: "name",
                  header: "Room / Station",
                  align: "left",
                  render: (room) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditRoom(room);
                      }}
                      className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate cursor-pointer"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {room.name}
                    </button>
                  ),
                },
                {
                  id: "location",
                  header: "Location",
                  align: "left",
                  render: (room) => (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {room.location || "California"}
                    </span>
                  ),
                },
                {
                  id: "service",
                  header: "Assigned Service",
                  align: "left",
                  render: (room) => (
                    room.serviceName ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {room.serviceName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-sans">All Services</span>
                    )
                  ),
                },
                {
                  id: "responsible",
                  header: "Responsible Staff",
                  align: "left",
                  render: (room) => (
                    room.responsibleName ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {room.responsibleName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic font-sans">Unassigned</span>
                    )
                  ),
                },
                {
                  id: "direction",
                  header: "Walking Directions / Guidance",
                  align: "left",
                  render: (room) => (
                    <span className="text-xs text-slate-600 line-clamp-1 max-w-xs" title={room.direction} style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {room.direction || "—"}
                    </span>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  align: "center",
                  render: (room) => (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        room.isActive !== false ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${room.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {room.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  ),
                },
              ];

              const roomRowActions: TableRowAction<Room>[] = [
                {
                  label: "Edit Room",
                  icon: <Edit2 className="w-3.5 h-3.5" />,
                  onClick: (room) => openEditRoom(room),
                },
                {
                  label: "Toggle Status",
                  icon: <ToggleLeft className="w-3.5 h-3.5" />,
                  onClick: (room) => handleToggleRoomActive(room.id),
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  isDanger: true,
                  onClick: (room) => handleDeleteRoom(room.id, room.name),
                },
              ];

              return (
                <TableComponent
                  data={filteredRooms}
                  columns={roomColumns}
                  getRowId={(r) => r.id}
                  rowActions={roomRowActions}
                  selectedIds={new Set(selectedRoomIds)}
                  onSelectionChange={(ids) => setSelectedRoomIds(Array.from(ids) as string[])}
                  onRowClick={(room) => openEditRoom(room)}
                  defaultRowsPerPage={20}
                  emptyMessage="No clinic rooms configured matching your search."
                />
              );
            })()}
          </>
        )}
      </div>

      {/* Add / Edit Room Drawer */}
      <DrawerShell
        isOpen={showAddRoomDrawer || showEditRoomDrawer}
        onClose={() => { setShowAddRoomDrawer(false); setShowEditRoomDrawer(false); resetRoomForm(); }}
        title={showEditRoomDrawer ? `Edit Room ${roomForm.roomNumber}` : "Add New Room"}
        subtitle="Define room number, walking guidance, location, and service assignment"
        icon={<Building2 className="w-4 h-4 text-blue-600" />}
        width="max-w-lg"
        zIndex={600}
        footer={
          <div className="flex items-center gap-2 w-full justify-end">
            <button
              type="button"
              onClick={() => { setShowAddRoomDrawer(false); setShowEditRoomDrawer(false); resetRoomForm(); }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveRoom(showEditRoomDrawer)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {showEditRoomDrawer ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showEditRoomDrawer ? "Save Changes" : "Add Room"}
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Room Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                placeholder="e.g. 101, 204"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Room / Station Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={roomForm.name}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Consultation Room 1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Location (Clinic Branch) <span className="text-red-500">*</span>
            </label>
            <select
              value={roomForm.location}
              onChange={(e) => setRoomForm((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {orgLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Associated Service
              </label>
              <select
                value={roomForm.serviceId}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, serviceId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="">Any / All Services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Responsible Practitioner
              </label>
              <select
                value={roomForm.responsibleId}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, responsibleId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="">Unassigned / Any Doctor</option>
                {allTeamEmps.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Walking Directions / Wayfinding Guidance
            </label>
            <textarea
              rows={3}
              value={roomForm.direction}
              onChange={(e) => setRoomForm((prev) => ({ ...prev, direction: e.target.value }))}
              placeholder="e.g. Walk past the main reception desk, turn left at corridor B; Room 101 is the first door on the right."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              AI Receptionist speaks and displays these exact walking directions when guiding patients to this room.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="roomIsActive"
              checked={roomForm.isActive}
              onChange={(e) => setRoomForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="roomIsActive" className="text-xs font-medium text-slate-700 cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }}>
              Room is active and available for appointment allocation
            </label>
          </div>
        </div>
      </DrawerShell>

        <DrawerShell
        isOpen={showAddDrawer}
        onClose={() => { setShowAddDrawer(false); resetForm(); }}
        title="Add New Product"
        subtitle="Define a product or service offering for your team"
        icon={<Plus className="w-4 h-4 text-blue-600" />}
        width="max-w-xl"
        zIndex={600}
        footer={renderFooterBtns(handleAdd, "Add Product", <Plus className="w-4 h-4" />)}
      >
        <div className="p-4 sm:p-5">
          <DraggableOverviewSections
            mode="service"
            customFieldsModule="service"
            sections={serviceSections}
            onSectionsChange={setServiceSections}
            fieldValues={fieldValues}
            onFieldValueChange={(k, v) => setFieldValues((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      </DrawerShell>

      <DrawerShell
        isOpen={showEditDrawer}
        onClose={() => { setShowEditDrawer(false); resetForm(); }}
        title="Product Details"
        subtitle={editingService?.name}
        icon={<Briefcase className="w-4 h-4 text-blue-600" />}
        width="max-w-xl"
        zIndex={600}
        footer={renderFooterBtns(handleEdit, "Save Changes", <Check className="w-4 h-4" />)}
      >
        <div className="p-4 sm:p-5">
          <DraggableOverviewSections
            mode="service"
            customFieldsModule="service"
            sections={serviceSections}
            onSectionsChange={setServiceSections}
            fieldValues={fieldValues}
            onFieldValueChange={(k, v) => setFieldValues((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      </DrawerShell>

      {/* Section-specific Field Selection Modal */}
      {fieldModalOpen && (
        <SelectFieldsModal
          onlyModules={["service"]}
          initiallySelected={
            targetSectionIdForField === "sec-service-info"
              ? serviceVisibleFieldKeys
              : allServiceSections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || []
          }
          onClose={() => {
            setFieldModalOpen(false);
            setTargetSectionIdForField(null);
          }}
          onApply={handleApplySelectedFields}
        />
      )}

      {/* Section-specific Custom Section Drawer */}
      {addSectionDrawerOpen && (
        <AdminSectionDrawer
          section={null}
          initialModule="service"
          isAdmin={false}
          zIndex={10001}
          onClose={() => setAddSectionDrawerOpen(false)}
          onSaved={() => {
            setAddSectionDrawerOpen(false);
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
