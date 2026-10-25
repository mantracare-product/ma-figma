import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Search, Clock, Check, Briefcase,
  Layers, Building2, MapPin, Navigation,
  Users, UserCheck, UserPlus, X
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import { useFieldRegistry, ALL_MODULES, FieldDefinition } from "../../context/FieldRegistryContext";
import { SelectFieldsModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import {
  Service, INIT_FORM, addService, updateService, EMPLOYEES, getStoredServices,
} from "../../../lib/servicesStore";
import { useTeamMembers } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredRooms, syncServiceRooms } from "../../../lib/roomsStore";

export interface AvailabilityRule {
  id: string;
  locationId: string;
  seats: number;
  assignedUserIds: (number | string)[];
  roomNumber?: string;
  roomName?: string;
  direction?: string;
}

export interface ServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  service?: Service | null;
  initialAvailableForAppointment?: boolean;
  onSaved?: (service: Service) => void;
  zIndex?: number;
}

export default function ServiceDrawer({
  isOpen,
  onClose,
  mode,
  service,
  initialAvailableForAppointment = false,
  onSaved,
  zIndex = 600,
}: ServiceDrawerProps) {
  const { teamMembers } = useTeamMembers();
  const { activeOrganization } = useOrganization();

  // Dynamic team members list
  const allTeamEmps = useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) {
      return EMPLOYEES.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        initials: e.initials,
        email: `${e.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      }));
    }
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

  const fullOrgLocations = useMemo<Array<{ id: string; name: string; address?: string }>>(() => {
    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l: any, idx: number) => ({
            id: l.id || `loc-${idx + 1}`,
            name: l.name || `Location ${idx + 1}`,
            address: l.address,
          }));
        }
      }
    } catch {}
    const locNames = activeOrganization.locations && activeOrganization.locations.length > 0
      ? activeOrganization.locations
      : [activeOrganization.location || "California"];
    return locNames.map((name: string, idx: number) => ({
      id: `loc-${idx + 1}`,
      name,
    }));
  }, [activeOrganization]);

  // Drawer Tabs: "overview" vs "availability"
  const [drawerActiveTab, setDrawerActiveTab] = useState<"overview" | "availability">("overview");
  const [availableForAppointment, setAvailableForAppointment] = useState<boolean>(initialAvailableForAppointment);
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);

  const [activeStaffDropdownLocId, setActiveStaffDropdownLocId] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, any>>({
    name: "",
    category: "General",
    cptCode: "",
    description: "",
    duration: 30,
    slotDuration: 30,
    price: 0,
    tax: 0,
    isActive: true,
  });

  // Overview Sections (Slot duration configured in Availability tab)
  const CANONICAL_SERVICE_SECTIONS: OverviewSection[] = useMemo(() => [
    {
      id: "sec-service-info",
      title: "Service Details",
      fieldKeys: ["name", "category", "cptCode", "description"],
    },
    {
      id: "sec-service-pricing",
      title: "Pricing",
      fieldKeys: ["price", "tax"],
    },
  ], []);

  const [serviceSections, setServiceSections] = useState<OverviewSection[]>(CANONICAL_SERVICE_SECTIONS);

  // Field registry
  const {
    getAllFields,
    getAllSections,
    assignFieldToSection,
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

  // Sync sections from registry
  useEffect(() => {
    try {
      const regSections = getAllSections("service");
      if (regSections && regSections.length > 0) {
        setServiceSections((prev) => {
          const map = new Map<string, OverviewSection>();
          CANONICAL_SERVICE_SECTIONS.forEach((s) => map.set(s.id, s));
          regSections
            .filter((rs) => rs.id !== "sec-service-assignment")
            .forEach((rs) => {
              const existing = map.get(rs.id);
              if (existing) {
                map.set(rs.id, {
                  ...existing,
                  title: rs.title || existing.title,
                  fieldKeys: Array.from(new Set([...existing.fieldKeys, ...(rs.fieldKeys || [])])).filter(
                    (k) => k !== "isActive" && k !== "assignedEmployees" && k !== "duration"
                  ),
                });
              } else {
                map.set(rs.id, {
                  id: rs.id,
                  title: rs.title,
                  description: rs.description,
                  isCustom: rs.source !== "system",
                  fieldKeys: (rs.fieldKeys || []).filter(
                    (k) => k !== "isActive" && k !== "assignedEmployees" && k !== "duration"
                  ),
                });
              }
            });
          return Array.from(map.values());
        });
      }
    } catch {}
  }, [isOpen]);

  // Click outside staff dropdown
  useEffect(() => {
    if (!activeStaffDropdownLocId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target as Node)) {
        setActiveStaffDropdownLocId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeStaffDropdownLocId]);

  // Reset or load initial data when drawer opens or service changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && service) {
      setAvailableForAppointment(service.availableForAppointment ?? true);
      const sDuration = service.slotDuration || service.duration || 30;
      setSlotDuration(sDuration);

      const existingRooms = getStoredRooms().filter((r) => String(r.serviceId) === String(service.id));
      const rules: AvailabilityRule[] = [];
      const effectiveLocIds = Array.isArray(service.locationIds) && service.locationIds.length > 0
        ? service.locationIds
        : fullOrgLocations.map((l) => l.id);

      effectiveLocIds.forEach((locId, idx) => {
        const matchedLoc = fullOrgLocations.find((l) => l.id === locId || l.name === locId);
        const locSeats =
          service.locationSeats?.[locId] ??
          (matchedLoc ? service.locationSeats?.[matchedLoc.name] : undefined) ??
          service.maxSeats ??
          1;
        const locEmps =
          service.locationEmployees?.[locId] ??
          (matchedLoc ? service.locationEmployees?.[matchedLoc.name] : undefined) ??
          service.assignedEmployees ??
          [];

        const roomConfig =
          service.locationRooms?.[locId] ??
          (matchedLoc ? service.locationRooms?.[matchedLoc.name] : undefined);
        const matchingStoredRoom = existingRooms.find(
          (r) => r.location === (matchedLoc?.name || locId) || r.location === locId
        );

        rules.push({
          id: `rule-${locId}-${idx}`,
          locationId: locId,
          seats: Number(locSeats) || 1,
          assignedUserIds: Array.isArray(locEmps) ? locEmps : [],
          roomNumber: roomConfig?.roomNumber || matchingStoredRoom?.roomNumber || "",
          roomName: roomConfig?.roomName || matchingStoredRoom?.name || "",
          direction: roomConfig?.direction || matchingStoredRoom?.direction || "",
        });
      });

      if (rules.length === 0 && fullOrgLocations.length > 0) {
        rules.push({
          id: `rule-${fullOrgLocations[0].id}-0`,
          locationId: fullOrgLocations[0].id,
          seats: service.maxSeats || 1,
          assignedUserIds: service.assignedEmployees || [],
          roomNumber: "",
          roomName: "",
          direction: "",
        });
      }

      setAvailabilityRules(rules);
      setFieldValues({
        name: service.name || "",
        category: service.category || "General",
        cptCode: service.cptCode || "",
        description: service.description || "",
        duration: sDuration,
        slotDuration: sDuration,
        price: service.price ?? 0,
        tax: service.tax ?? 0,
        isActive: service.isActive ?? true,
        ...(service.customFields || {}),
      });
      setDrawerActiveTab("overview");
    } else {
      // Add mode
      const isApptAvail = initialAvailableForAppointment;
      setAvailableForAppointment(isApptAvail);
      setSlotDuration(30);
      setDrawerActiveTab("overview");
      setActiveStaffDropdownLocId(null);
      setStaffSearchQuery("");

      const initialRule: AvailabilityRule[] = fullOrgLocations.length > 0 ? [{
        id: `rule-${fullOrgLocations[0].id}-0`,
        locationId: fullOrgLocations[0].id,
        seats: 1,
        assignedUserIds: [],
        roomNumber: "",
        roomName: "",
        direction: "",
      }] : [];
      setAvailabilityRules(initialRule);

      setFieldValues({
        name: "",
        category: "General",
        cptCode: "",
        description: "",
        duration: 30,
        slotDuration: 30,
        price: 0,
        tax: 0,
        isActive: true,
      });
    }
  }, [isOpen, mode, service, initialAvailableForAppointment]);

  const handleAddAvailabilityRule = () => {
    const usedLocs = new Set(availabilityRules.map((r) => r.locationId));
    const nextUnused = fullOrgLocations.find((l) => !usedLocs.has(l.id) && !usedLocs.has(l.name));
    const nextLocId = nextUnused ? nextUnused.id : (fullOrgLocations[0]?.id || "loc-1");

    setAvailabilityRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        locationId: nextLocId,
        seats: 1,
        assignedUserIds: [],
        roomNumber: "",
        roomName: "",
        direction: "",
      },
    ]);
  };

  const handleUpdateRuleField = (ruleId: string, field: keyof AvailabilityRule, value: any) => {
    setAvailabilityRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, [field]: value } : r))
    );
  };

  const handleToggleRuleUser = (ruleId: string, userId: number | string) => {
    setAvailabilityRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const strId = String(userId);
        const exists = r.assignedUserIds.some((id) => String(id) === strId);
        const updated = exists
          ? r.assignedUserIds.filter((id) => String(id) !== strId)
          : [...r.assignedUserIds, userId];
        return { ...r, assignedUserIds: updated };
      })
    );
  };

  const handleRemoveRuleUser = (ruleId: string, userId: number | string) => {
    setAvailabilityRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, assignedUserIds: r.assignedUserIds.filter((id) => String(id) !== String(userId)) }
          : r
      )
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setAvailabilityRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleSave = () => {
    const name = String(fieldValues["name"] || "").trim();
    if (!name) {
      toast.error("Service name is required");
      return;
    }

    if (availableForAppointment && availabilityRules.length === 0) {
      toast.error("Please add at least one location in Availability");
      return;
    }

    const locIdsList: string[] = [];
    const seatsMap: Record<string, number> = {};
    const empsMap: Record<string, (string | number)[]> = {};
    const locationRooms: Record<string, { roomNumber?: string; roomName?: string; direction?: string }> = {};
    const allAssignedIds = new Set<string | number>();

    availabilityRules.forEach((r) => {
      locIdsList.push(r.locationId);
      const matchedLoc = fullOrgLocations.find((l) => l.id === r.locationId || l.name === r.locationId);
      const seats = Math.max(1, r.seats || 1);
      seatsMap[r.locationId] = seats;
      empsMap[r.locationId] = r.assignedUserIds;
      locationRooms[r.locationId] = {
        roomNumber: r.roomNumber || "",
        roomName: r.roomName || "",
        direction: r.direction || "",
      };

      if (matchedLoc) {
        seatsMap[matchedLoc.name] = seats;
        empsMap[matchedLoc.name] = r.assignedUserIds;
        locationRooms[matchedLoc.name] = {
          roomNumber: r.roomNumber || "",
          roomName: r.roomName || "",
          direction: r.direction || "",
        };
      }
      r.assignedUserIds.forEach((id) => allAssignedIds.add(id));
    });

    const locationIds = locIdsList.length > 0 ? locIdsList : undefined;
    const locationSeats = Object.keys(seatsMap).length > 0 ? seatsMap : undefined;
    const locationEmployees = Object.keys(empsMap).length > 0 ? empsMap : undefined;
    const maxSeats = availabilityRules[0]?.seats || 1;
    const assignedEmployees = Array.from(allAssignedIds);
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

    const SYSTEM_KEYS = new Set([
      "name", "category", "cptCode", "description", "duration", "slotDuration", "price", "tax", "isActive", "assignedEmployees"
    ]);
    const customFields: Record<string, any> = {};
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (!SYSTEM_KEYS.has(k)) {
        customFields[k] = v;
      }
    });

    const effectiveDuration = Number(slotDuration) || Number(fieldValues["duration"]) || 30;

    let savedItem: Service;
    if (mode === "edit" && service) {
      updateService(service.id, {
        name,
        description: String(fieldValues["description"] || ""),
        category: String(fieldValues["category"] || "General"),
        cptCode: String(fieldValues["cptCode"] || "").trim() || undefined,
        duration: effectiveDuration,
        slotDuration: effectiveDuration,
        price: Number(fieldValues["price"]) || 0,
        currency: "USD",
        tax: Number(fieldValues["tax"]) || 0,
        isActive: true,
        availableForAppointment,
        assignedEmployees,
        locationIds,
        maxSeats,
        locationSeats,
        locationEmployees,
        locationRooms,
        activity: `Updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        customFields,
      });
      syncServiceRooms(service.id, name, availabilityRules, allTeamEmps, fullOrgLocations);
      savedItem = {
        ...service,
        name,
        description: String(fieldValues["description"] || ""),
        category: String(fieldValues["category"] || "General"),
        cptCode: String(fieldValues["cptCode"] || "").trim() || undefined,
        duration: effectiveDuration,
        slotDuration: effectiveDuration,
        price: Number(fieldValues["price"]) || 0,
        currency: "USD",
        tax: Number(fieldValues["tax"]) || 0,
        isActive: true,
        availableForAppointment,
        assignedEmployees,
        locationIds,
        maxSeats,
        locationSeats,
        locationEmployees,
        locationRooms,
        customFields,
      };
      toast.success(`"${name}" updated`);
    } else {
      savedItem = addService({
        name,
        description: String(fieldValues["description"] || ""),
        category: String(fieldValues["category"] || "General"),
        cptCode: String(fieldValues["cptCode"] || "").trim() || undefined,
        duration: effectiveDuration,
        slotDuration: effectiveDuration,
        price: Number(fieldValues["price"]) || 0,
        currency: "USD",
        tax: Number(fieldValues["tax"]) || 0,
        isActive: true,
        availableForAppointment,
        assignedEmployees,
        locationIds,
        maxSeats,
        locationSeats,
        locationEmployees,
        locationRooms,
        createdAt: nowStr,
        activity: `Created ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        customFields,
      });
      syncServiceRooms(savedItem.id, savedItem.name, availabilityRules, allTeamEmps, fullOrgLocations);
      toast.success(`"${savedItem.name}" added`);
    }

    onSaved?.(savedItem);
    onClose();
  };

  // Render Drawer Tabs: if availableForAppointment is false, ONLY show Overview!
  const renderDrawerTabs = () => {
    if (!availableForAppointment) {
      return (
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <div
            className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs bg-white text-slate-900 shadow-2xs font-bold"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Overview</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setDrawerActiveTab("overview")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
            drawerActiveTab === "overview"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setDrawerActiveTab("availability")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
            drawerActiveTab === "availability"
              ? "bg-white text-slate-900 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Availability</span>
          {availabilityRules.length > 0 && (
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
              {availabilityRules.length}
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderAvailabilityTab = () => {
    const filteredStaffList = allTeamEmps.filter((e) =>
      e.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
      (e.email && e.email.toLowerCase().includes(staffSearchQuery.toLowerCase()))
    );

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Availability Header info */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              Appointment Availability & Locations
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure slot duration and branch availability rules for booking appointments.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {availabilityRules.length} {availabilityRules.length === 1 ? "location" : "locations"}
          </span>
        </div>

        {/* ── Slot Duration (Above Locations, Common for All Locations) ── */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Slot Duration <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
              Common across all locations
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            The booking slot duration for appointments of this service across all clinic locations.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="relative w-44">
              <input
                type="number"
                min={1}
                step={5}
                value={slotDuration || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const finalVal = isNaN(val) ? 0 : Math.max(0, val);
                  setSlotDuration(finalVal);
                  setFieldValues((prev) => ({ ...prev, duration: finalVal, slotDuration: finalVal }));
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-bold text-slate-800 transition-all outline-none shadow-2xs pr-12"
                style={{ fontFamily: "Outfit, sans-serif" }}
                placeholder="30"
              />
              <span className="absolute right-3.5 top-3 text-[11px] font-semibold text-slate-400 pointer-events-none">
                mins
              </span>
            </div>
          </div>
        </div>

        {/* Location Availability Rules Cards */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              Location Rules
            </h4>
          </div>

          {availabilityRules.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
              <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                No availability locations configured
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Add an availability rule to define where clients can book this service and who provides it.
              </p>
            </div>
          ) : (
            availabilityRules.map((rule, idx) => {
              const assignedUsers = allTeamEmps.filter((e) =>
                rule.assignedUserIds.some((id) => String(id) === String(e.id))
              );
              const isStaffPickerOpen = activeStaffDropdownLocId === rule.id;

              return (
                <div
                  key={rule.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3 relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {fullOrgLocations.find((l) => l.id === rule.locationId || l.name === rule.locationId)?.name || "Location Configuration"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        Branch Configuration
                      </span>
                    </div>

                    {/* Delete rule button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove this location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Row 1: Location & Seats */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Location */}
                    <div className="sm:col-span-8 space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>Location <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={rule.locationId}
                        onChange={(e) => handleUpdateRuleField(rule.id, "locationId", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer outline-none shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {fullOrgLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name} {loc.name.toLowerCase() === "online" ? "(Virtual)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seat Capacity */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>Seats <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={rule.seats}
                        onChange={(e) => handleUpdateRuleField(rule.id, "seats", parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-800 text-center transition-colors outline-none shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Room Number & Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start pt-1">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Building2 className="w-3 h-3 text-blue-600" />
                        <span>Room Number</span>
                      </label>
                      <input
                        type="text"
                        value={rule.roomNumber || ""}
                        onChange={(e) => handleUpdateRuleField(rule.id, "roomNumber", e.target.value)}
                        placeholder="e.g. 101, Suite 4B"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 transition-colors outline-none shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>

                    <div className="sm:col-span-7 space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <Layers className="w-3 h-3 text-blue-600" />
                        <span>Label (Name of the room)</span>
                      </label>
                      <input
                        type="text"
                        value={rule.roomName || ""}
                        onChange={(e) => handleUpdateRuleField(rule.id, "roomName", e.target.value)}
                        placeholder="e.g. Consultation Room 1"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 transition-colors outline-none shadow-2xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Directions */}
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Directions</span>
                    </label>
                    <input
                      type="text"
                      value={rule.direction || ""}
                      onChange={(e) => handleUpdateRuleField(rule.id, "direction", e.target.value)}
                      placeholder="e.g. Ground floor, turn left past main reception desk"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 transition-colors outline-none shadow-2xs"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>

                  {/* Assign User Section */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <UserPlus className="w-3 h-3 text-blue-600" />
                        <span>Assign User(s)</span>
                        {assignedUsers.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({assignedUsers.length} assigned)
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStaffSearchQuery("");
                          setActiveStaffDropdownLocId(isStaffPickerOpen ? null : rule.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>{assignedUsers.length > 0 ? "Edit Users" : "+ Assign User"}</span>
                      </button>
                    </div>

                    {/* Assigned User Chips */}
                    {assignedUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedUsers.map((emp) => (
                          <div
                            key={emp.id}
                            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg group/chip hover:border-slate-300 transition-colors"
                          >
                            <div className="w-4 h-4 rounded-full bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                              {emp.initials}
                            </div>
                            <span className="text-xs font-semibold text-slate-800 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {emp.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRuleUser(rule.id, emp.id)}
                              className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 rounded hover:bg-rose-50 transition-colors"
                              title="Remove user"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No specific practitioner assigned. Available to all team members.
                      </p>
                    )}

                    {/* Staff Selection Popover */}
                    {isStaffPickerOpen && (
                      <div
                        ref={staffDropdownRef}
                        className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 animate-in fade-in-80 zoom-in-95 max-w-sm"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Assign Practitioners
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveStaffDropdownLocId(null)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search by name or role..."
                            value={staffSearchQuery}
                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                            autoFocus
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredStaffList.length === 0 ? (
                            <div className="text-center py-3 text-xs text-slate-400">
                              No practitioners matching "{staffSearchQuery}"
                            </div>
                          ) : (
                            filteredStaffList.map((emp) => {
                              const isChecked = rule.assignedUserIds.some((id) => String(id) === String(emp.id));
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => handleToggleRuleUser(rule.id, emp.id)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                    isChecked ? "bg-blue-50/80 text-blue-900 font-semibold" : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                    }`}>
                                      {isChecked && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                      {emp.initials}
                                    </div>
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-slate-800 block" style={{ fontFamily: "Outfit, sans-serif" }}>
                                        {emp.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block leading-tight">
                                        {emp.role}
                                      </span>
                                    </div>
                                  </div>
                                  {isChecked && <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {assignedUsers.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveStaffDropdownLocId(null)}
                            className="px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Small Add Location Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAddAvailabilityRule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Location</span>
          </button>
        </div>
      </div>
    );
  };

  // Footer with "Available for appointment" checkbox
  const renderFooter = () => (
    <div className="flex items-center justify-between w-full gap-3">
      {/* Available for appointment checkbox */}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none group py-1">
        <input
          type="checkbox"
          checked={availableForAppointment}
          onChange={(e) => {
            const checked = e.target.checked;
            setAvailableForAppointment(checked);
            if (!checked && drawerActiveTab === "availability") {
              setDrawerActiveTab("overview");
            }
          }}
          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-colors"
        />
        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
          Available for appointment
        </span>
      </label>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {mode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{mode === "edit" ? "Save Changes" : "Add Product"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title={mode === "edit" ? "Product Details" : "Add New Product"}
        subtitle={mode === "edit" ? (service?.name || "Edit offering") : "Define a product or service offering for your team"}
        icon={mode === "edit" ? <Briefcase className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
        width="max-w-xl"
        zIndex={zIndex}
        tabs={renderDrawerTabs()}
        bodyClassName="p-5 sm:p-6 space-y-5"
        footer={renderFooter()}
      >
        {drawerActiveTab === "overview" || !availableForAppointment ? (
          <DraggableOverviewSections
            mode="service"
            customFieldsModule="service"
            sections={serviceSections.filter((s) => s.id !== "sec-service-assignment")}
            onSectionsChange={setServiceSections}
            fieldValues={fieldValues}
            onFieldValueChange={(k, v) => setFieldValues((prev) => ({ ...prev, [k]: v }))}
          />
        ) : (
          renderAvailabilityTab()
        )}
      </DrawerShell>

      {fieldModalOpen && (
        <SelectFieldsModal
          onlyModules={["service"]}
          initiallySelected={
            targetSectionIdForField === "sec-service-info"
              ? serviceVisibleFieldKeys
              : []
          }
          onClose={() => {
            setFieldModalOpen(false);
            setTargetSectionIdForField(null);
          }}
          onApply={handleApplySelectedFields}
        />
      )}

      {addSectionDrawerOpen && (
        <AdminSectionDrawer
          section={null}
          initialModule="service"
          isAdmin={false}
          zIndex={zIndex + 10}
          onClose={() => setAddSectionDrawerOpen(false)}
          onSaved={() => setAddSectionDrawerOpen(false)}
        />
      )}
    </>
  );
}
