import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getStoredServices, onServicesChanged } from "../../../lib/servicesStore";
import { useTeamMembers, TEAM_STORE_EVENT } from "../../../lib/teamStore";
import { InvoiceLineItem } from "../../types/invoiceTypes";
import {
  ChevronDown,
  Check,
  CheckCircle2,
  Video,
  Building2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { getStoredClients } from "../../../lib/clientsStore";
import { useOrganization } from "../../context/OrganizationContext";
import { CustomSideDrawer } from "../ui/drawer";
import { FieldDefinition } from "../../context/FieldRegistryContext";
import { InfoTooltip } from "../help/InfoTooltip";
import { hasInvoiceAutomation, hasAppointmentInvoiceAutomation } from "../../../lib/invoiceService";
import { hasAppointmentAutomation, appointmentService } from "../../../lib/appointmentService";
import { AUTOMATION_STORE_EVENT } from "../../../lib/useAutomationStore";
import { PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { Link } from "react-router";
import { toast } from "sonner";
import { findRoomForAppointment, Room } from "../../../lib/roomsStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientOption {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  specialty?: string;
  avatar?: string;
  availability?: string;
  status?: string;
  process?: string;
  responsiblePerson?: string;
  insurance?: string;
}

export interface Employee {
  id: number | string;
  name: string;
  email: string;
}

export interface BookingFormValues {
  title: string;
  description: string;
  note: string;
  tags: string;
  processId: string;
  stageId: string;
  date: string;
  startHour: number;
  startMinute: number;
  sessionType: "video" | "inPerson";
  client: ClientOption | null;
  provider: Employee | null;
  serviceId?: string;
  serviceName?: string;
  generateInvoice?: boolean;
  lineItems?: InvoiceLineItem[];
  discountAmount?: number;
  location?: string;
  roomNumber?: string;
  roomStationId?: string;
  roomName?: string;
  primaryInsurance?: string;
  secondaryInsurance?: string;
  source?: string;
}

export interface ScheduleAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "reschedule";
  values: BookingFormValues;
  onChange: (patch: Partial<BookingFormValues>) => void;
  onSave: () => void;
  isSaving?: boolean;
  employees: Employee[];
  clients: ClientOption[];
  processStages: Record<string, string[]>;
  customFields: FieldDefinition[];
  visibleCustomFieldKeys: string[];
  customFieldValues: Record<string, string>;
  onCustomFieldChange: (key: string, value: string) => void;
  onOpenSelectFields: () => void;
  onOpenCreateField: () => void;
}

// ─── Custom Dropdown (portal-based, relative to page/viewport) ────────────────

interface DropdownOption {
  value: string;
  label: string;
  meta?: string;
}

function CustomDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    openUp: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownMaxHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownMaxHeight && rect.top > spaceBelow;

    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // Don't close or jump if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-left transition-all ${
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-white hover:border-slate-300 cursor-pointer focus:outline-none focus:border-slate-400"
        }`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.openUp ? undefined : `${coords.top}px`,
              bottom: coords.openUp ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 100000,
              maxHeight: "220px",
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto py-1"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-slate-100/80 text-slate-900 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium truncate">{opt.label}</p>
                      {opt.meta && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{opt.meta}</p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-800 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Sub-components matching Client Profile card style ─────────────────────────

/** Section card — matches the rounded-xl border shadow-xs bg-white card in client profile */
const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
    {children}
  </div>
);

/** Section header row — matches "CLIENT DETAILS" uppercase header with border-b */
const SectionHeader = ({ title }: { title: string }) => (
  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-white">
    <h3
      className="text-xs font-bold text-slate-600 uppercase tracking-wider"
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      {title}
    </h3>
  </div>
);

/** Field row — label on top, input below, matching DraggableOverviewSections row */
const FieldRow = ({
  label,
  required,
  tooltip,
  children,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) => (
  <div className="p-2 rounded-lg hover:bg-slate-50/60 transition-colors">
    <label
      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <span>{label}</span>
      {tooltip && <InfoTooltip text={tooltip} size="sm" />}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

/** Base input field */
const FieldInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-0 transition-all"
    style={{ fontFamily: "Outfit, sans-serif" }}
  />
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ScheduleAppointmentDrawer({
  isOpen,
  onClose,
  mode,
  values,
  onChange,
  onSave,
  employees,
  clients,
  processStages,
  customFields,
  visibleCustomFieldKeys,
  customFieldValues,
  onCustomFieldChange,
  onOpenSelectFields,
  onOpenCreateField,
  isSaving = false,
}: ScheduleAppointmentDrawerProps) {
  // ── Available clients (synced directly with clientsStore to match Clients page) ──
  const allAvailableClients: ClientOption[] = useMemo(() => {
    const list: ClientOption[] = [];
    const seenIds = new Set<string>();

    const stored = getStoredClients();
    if (stored?.length) {
      stored.forEach((c) => {
        const idStr = String(c.id);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          list.push({
            id: c.id,
            name: c.name,
            email: c.email || "",
            phone: c.phone || "",
            status: c.status || "Active",
            process: Array.isArray(c.processes) ? c.processes[0] : (c as any).process,
          });
        }
      });
    }

    if (clients?.length) {
      clients.forEach((c) => {
        const idStr = String(c.id);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          list.push(c);
        }
      });
    }

    if (values.client && !seenIds.has(String(values.client.id))) {
      list.unshift(values.client);
    }
    return list;
  }, [clients, values.client, isOpen]);

  const { teamMembers, bookableMembers } = useTeamMembers();

  const [locVersion, setLocVersion] = useState(0);
  const [automationVersion, setAutomationVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => {
      setLocVersion((v) => v + 1);
      setAutomationVersion((v) => v + 1);
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("mantra_locations_changed", handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleUpdate);
    window.addEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("mantra_locations_changed", handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleUpdate);
      window.removeEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocVersion((v) => v + 1);
      setAutomationVersion((v) => v + 1);
      setStoredServicesState(getStoredServices());
    }
  }, [isOpen]);

  const appointmentAutomationConfigured = hasAppointmentAutomation(values.processId);
  const invoiceAutomationConfigured = hasInvoiceAutomation(values.processId);
  const appointmentInvoiceAutomationConfigured = hasAppointmentInvoiceAutomation(values.processId);

  // Auto-enable generateInvoice ONLY if appointment-to-invoice automation is specifically configured
  useEffect(() => {
    if (isOpen && appointmentInvoiceAutomationConfigured && values.generateInvoice === undefined) {
      onChange({ generateInvoice: true });
    }
  }, [isOpen, appointmentInvoiceAutomationConfigured, values.generateInvoice, onChange]);

  // Combine employees prop with teamMembers store
  const allEmployeesList: Employee[] = useMemo(() => {
    const list: Employee[] = [];
    const seenIds = new Set<string>();

    const sourceMembers = (teamMembers && teamMembers.length > 0)
      ? teamMembers
      : (bookableMembers && bookableMembers.length > 0)
      ? bookableMembers
      : employees || [];

    sourceMembers.forEach((m: any) => {
      if (!seenIds.has(String(m.id))) {
        seenIds.add(String(m.id));
        list.push({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role || m.department || "Staff",
          locations: m.locations || m.availableLocations || [],
        } as any);
      }
    });

    return list;
  }, [employees, teamMembers, bookableMembers, locVersion]);

  // Live services sync from store
  const [storedServicesState, setStoredServicesState] = useState(getStoredServices);

  useEffect(() => {
    return onServicesChanged(() => setStoredServicesState(getStoredServices()));
  }, []);

  // ── Available services ──
  const allAvailableServices = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
      tax?: number;
      assignedEmployees?: (number | string)[];
    }> = [];
    const seenNames = new Set<string>();
    try {
      const stored = storedServicesState;
      if (Array.isArray(stored)) {
        stored.forEach((s) => {
          if (!seenNames.has(s.name.toLowerCase())) {
            seenNames.add(s.name.toLowerCase());
            list.push({
              id: String(s.id),
              name: s.name,
              price: s.price,
              duration: s.duration || 30,
              tax: s.tax || 0,
              assignedEmployees: s.assignedEmployees,
            });
          }
        });
      }
    } catch { /* ignore */ }
    return list;
  }, [storedServicesState]);

  // ── Time helpers ──
  const endHour = (values.startHour + 1) % 24;
  const endMin = values.startMinute;
  const pad = (n: number) => String(n).padStart(2, "0");
  const startHHMM = `${pad(values.startHour)}:${pad(values.startMinute)}`;
  const endHHMM = `${pad(endHour)}:${pad(endMin)}`;

  const fmtTime = (hhmm: string) => {
    if (!values.date) return "";
    const [yr, mo, dy] = values.date.split("-").map(Number);
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(yr, (mo || 1) - 1, dy || 1, h, m);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const fmtShortDate = () => {
    if (!values.date) return "";
    const [yr, mo, dy] = values.date.split("-").map(Number);
    return new Date(yr, (mo || 1) - 1, dy || 1).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // ── Organization Locations ──
  const { activeOrganization } = useOrganization();
  const orgLocations = useMemo(() => {
    const list: Array<{ id: string; name: string; address?: string; phone?: string; timezone?: string; type?: string }> = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any, idx: number) => {
            if (!seen.has(l.name.toLowerCase())) {
              seen.add(l.name.toLowerCase());
              let fullAddr = l.address || "";
              const extraParts = [l.city, l.state, l.zip].filter(Boolean).join(", ");
              if (extraParts && !fullAddr.includes(extraParts)) {
                fullAddr = fullAddr ? `${fullAddr}, ${extraParts}` : extraParts;
              }
              if (l.type === "online" || l.name.toLowerCase() === "online") {
                fullAddr = "Virtual / Telehealth Consultation";
              }
              list.push({
                id: l.id || `loc-${idx + 1}`,
                name: l.name,
                address: fullAddr || (l.type === "online" ? "Virtual / Telehealth Consultation" : undefined),
                phone: l.phone,
                timezone: l.timezone,
                type: l.type,
              });
            }
          });
        }
      }
    } catch { /* ignore */ }

    // Fallback only if no stored organization locations exist
    if (list.length === 0) {
      const locNames = activeOrganization.locations && activeOrganization.locations.length > 0
        ? activeOrganization.locations
        : [activeOrganization.location || "California"];

      locNames.forEach((name, idx) => {
        const isOnline = name.toLowerCase() === "online" || name.toLowerCase().includes("virtual");
        const formatted = isOnline
          ? "Online"
          : name.includes("Center") || name.includes("Clinic") || name.includes("Branch")
          ? name
          : `${name} Branch`;
        if (!seen.has(formatted.toLowerCase())) {
          seen.add(formatted.toLowerCase());
          list.push({
            id: `loc-${idx + 1}`,
            name: formatted,
            address: isOnline ? "Virtual / Telehealth Consultation" : undefined,
            type: isOnline ? "online" : "physical",
          });
        }
      });
    }

    if (!list.some((l) => l.name.toLowerCase() === "online" || l.type === "online")) {
      list.push({ id: "loc-online", name: "Online", address: "Virtual / Telehealth Consultation", type: "online" });
    }

    return list;
  }, [activeOrganization, locVersion]);

  // ── Provider Location Availability & Days Off Notice ──
  const providerAvailabilityNotice = useMemo(() => {
    if (!values.provider) return null;

    // 1. Check Common Days Off for this provider
    if (values.date) {
      try {
        const daysOffSaved = localStorage.getItem(
          `mantra_member_common_days_off_${values.provider.id}_${activeOrganization.id}`
        );
        if (daysOffSaved) {
          const daysOff = JSON.parse(daysOffSaved);
          const matchDayOff = Array.isArray(daysOff) && daysOff.find((d: any) => d.date === values.date);
          if (matchDayOff) {
            return {
              type: "warning" as const,
              message: `${values.provider.name} has a scheduled day off (${matchDayOff.duration}${
                matchDayOff.reason ? `: ${matchDayOff.reason}` : ""
              }) on this date.`,
            };
          }
        }
      } catch { /* ignore */ }
    }

    // 2. Check Location schedule if location is selected
    const targetLoc = values.sessionType === "inPerson" ? values.location : undefined;
    if (targetLoc && targetLoc.toLowerCase() !== "online") {
      try {
        const schedSaved = localStorage.getItem(
          `mantra_member_loc_schedules_${values.provider.id}_${activeOrganization.id}`
        );
        if (schedSaved) {
          const schedules = JSON.parse(schedSaved);
          const matchedLocSched = Object.values(schedules).find(
            (s: any) => s.locationName === targetLoc || s.locationId === targetLoc
          ) as any;

          if (matchedLocSched) {
            if (!matchedLocSched.isAvailableAtLocation) {
              return {
                type: "warning" as const,
                message: `${values.provider.name} is not marked as active at ${targetLoc}.`,
              };
            }

            if (values.date) {
              const dayIndex = new Date(values.date + "T00:00:00").getDay();
              const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
              const dayKey = dayKeys[dayIndex];
              const dayHours = matchedLocSched.workingHours?.[dayKey];

              if (dayHours && !dayHours.enabled) {
                return {
                  type: "warning" as const,
                  message: `${values.provider.name} is not scheduled at ${targetLoc} on ${
                    dayKey.charAt(0).toUpperCase() + dayKey.slice(1)
                  }s.`,
                };
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    return {
      type: "success" as const,
      message: `${values.provider.name} is available${targetLoc ? ` for ${targetLoc}` : ""}.`,
    };
  }, [values.provider, values.date, values.location, values.sessionType, activeOrganization.id]);

  const fmt12 = (h: number, mn: number) => {
    const p = h >= 12 ? "PM" : "AM";
    return `${h % 12 === 0 ? 12 : h % 12}:${pad(mn)} ${p}`;
  };

  // ── Available responsible providers filtered by BOTH selected Service and Location ──
  const availableEmployeesForServiceAndLocation = useMemo(() => {
    let list = allEmployeesList;

    // 1. Filter by selected Service
    if (values.serviceId) {
      const selectedSrv = allAvailableServices.find(
        (s) => String(s.id) === String(values.serviceId)
      );
      if (selectedSrv?.assignedEmployees && selectedSrv.assignedEmployees.length > 0) {
        const assignedIds = new Set(selectedSrv.assignedEmployees.map(String));
        const serviceMatched = list.filter(
          (emp) => assignedIds.has(String(emp.id))
        );
        if (serviceMatched.length > 0) {
          list = serviceMatched;
        }
      }
    }

    // 2. Filter by selected Location (only if physical in-person location)
    if (values.location && values.location.trim() && values.sessionType === "inPerson") {
      const targetLoc = values.location.trim().toLowerCase();
      if (targetLoc !== "online") {
        const locationMatched = list.filter((emp) => {
          try {
            const locActiveKey = `mantra_user_loc_active_map_${emp.id}_${activeOrganization.id}`;
            const savedActive = localStorage.getItem(locActiveKey);
            if (savedActive) {
              const activeMap = JSON.parse(savedActive);
              const targetLocObj = orgLocations.find((ol) => ol.name.toLowerCase() === targetLoc);
              if (targetLocObj && activeMap[targetLocObj.id] === true) {
                return true;
              }
            }
          } catch {}

          const memberObj = emp as any;
          const memberLocs: string[] = memberObj.locations || memberObj.availableLocations || [];
          if (Array.isArray(memberLocs) && memberLocs.length > 0) {
            return memberLocs.some((l) => l.toLowerCase() === targetLoc || targetLoc.includes(l.toLowerCase()));
          }

          return true;
        });

        if (locationMatched.length > 0) {
          list = locationMatched;
        }
      }
    }

    return list;
  }, [values.serviceId, values.location, values.sessionType, allAvailableServices, allEmployeesList, orgLocations, activeOrganization.id]);

  // ── Auto-allocated Room based on Service, Location, and Responsible Provider ──
  const allocatedRoom = useMemo(() => {
    // Room mapping requires Location (physical), Product Service, and Responsible Staff
    if (!values.location || values.location.toLowerCase() === "online" || !values.serviceId || !values.provider) {
      return undefined;
    }
    const srvName = values.serviceName || allAvailableServices.find((s) => String(s.id) === String(values.serviceId))?.name;
    return findRoomForAppointment({
      serviceId: values.serviceId,
      serviceName: srvName,
      location: values.location,
      employeeId: values.provider?.id,
      employeeName: values.provider?.name,
    });
  }, [values.serviceId, values.serviceName, values.location, values.provider, allAvailableServices]);

  // ── Compute Available Slots for Provider, Date & Location ──
  const { generatedSlots, slotDuration, dayOffNotice } = useMemo(() => {
    if (!values.provider || !values.date) {
      return { generatedSlots: [], slotDuration: 30, dayOffNotice: null };
    }

    const selectedSrv = allAvailableServices.find(
      (s) => String(s.id) === String(values.serviceId)
    );
    const duration = selectedSrv?.duration || 30;

    // 1. Check if provider has a scheduled Day Off
    let dayOff: any = null;
    try {
      const daysOffSaved = localStorage.getItem(
        `mantra_member_common_days_off_${values.provider.id}_${activeOrganization.id}`
      );
      if (daysOffSaved) {
        const daysOffList = JSON.parse(daysOffSaved);
        dayOff = Array.isArray(daysOffList) && daysOffList.find((d: any) => d.date === values.date);
      }
    } catch {}

    if (dayOff && dayOff.duration === "All Day") {
      return {
        generatedSlots: [],
        slotDuration: duration,
        dayOffNotice: `${values.provider.name} has a scheduled day off on this date${dayOff.reason ? ` (${dayOff.reason})` : ""}.`,
      };
    }

    // 2. Determine day of week
    const [yr, mo, dy] = values.date.split("-").map(Number);
    const dateObj = new Date(yr, (mo || 1) - 1, dy || 1);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayKey = dayNames[dateObj.getDay()];

    // 3. Check provider weekly slots / operating hours
    let startMin = 9 * 60; // 09:00 AM default
    let endMin = 17 * 60;  // 05:00 PM default
    let isDayEnabled = true;

    const targetLoc = values.location || "California Branch";
    const targetLocObj = orgLocations.find((l) => l.name.toLowerCase() === targetLoc.toLowerCase());
    const locId = targetLocObj?.id || "loc-1";

    try {
      // Check stored custom slots for [user + location]
      const savedUserSlots = localStorage.getItem(
        `mantra_user_loc_slots_${values.provider.id}_${locId}_${activeOrganization.id}`
      );
      if (savedUserSlots) {
        const parsed = JSON.parse(savedUserSlots);
        const dayAvailability = parsed[dayKey];
        if (dayAvailability) {
          isDayEnabled = dayAvailability.enabled;
          if (dayAvailability.slots && dayAvailability.slots.length > 0) {
            const firstSlot = dayAvailability.slots[0];
            const [sh, sm] = firstSlot.start.split(":").map(Number);
            const [eh, em] = firstSlot.end.split(":").map(Number);
            startMin = sh * 60 + sm;
            endMin = eh * 60 + em;
          }
        }
      } else {
        // Check location schedules
        const schedSaved = localStorage.getItem(
          `mantra_member_loc_schedules_${values.provider.id}_${activeOrganization.id}`
        );
        if (schedSaved) {
          const schedules = JSON.parse(schedSaved);
          const matched = Object.values(schedules).find(
            (s: any) => s.locationName === targetLoc || s.locationId === targetLoc
          ) as any;
          if (matched && matched.workingHours?.[dayKey]) {
            const wh = matched.workingHours[dayKey];
            isDayEnabled = wh.enabled;
            if (wh.start && wh.end) {
              const [sh, sm] = wh.start.split(":").map(Number);
              const [eh, em] = wh.end.split(":").map(Number);
              startMin = sh * 60 + sm;
              endMin = eh * 60 + em;
            }
          }
        }
      }
    } catch {}

    // Special allowance: Admin User at California Branch is available on working days
    if (!isDayEnabled && (values.provider.name.toLowerCase().includes("admin") || String(values.provider.id) === "1")) {
      isDayEnabled = true;
    }

    if (!isDayEnabled) {
      return {
        generatedSlots: [],
        slotDuration: duration,
        dayOffNotice: `${values.provider.name} is not scheduled to work on ${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}s.`,
      };
    }

    // 4. Check already booked appointments to prevent conflicts
    const bookedTimes = new Set<string>();
    try {
      const allAppts = appointmentService.getAppointments();
      allAppts.forEach((apt) => {
        if (
          apt.date === values.date &&
          String(apt.employeeId) === String(values.provider?.id) &&
          apt.status !== "cancelled" &&
          apt.time
        ) {
          const [ah, am] = apt.time.split(":").map(Number);
          bookedTimes.add(`${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`);
        }
      });
    } catch {}

    // 5. Generate discrete time slots
    const slots: Array<{ hour: number; minute: number; timeStr: string; label12: string; isBooked: boolean }> = [];
    for (let current = startMin; current + duration <= endMin; current += duration) {
      // Check partial day off
      if (dayOff) {
        if (dayOff.duration === "Morning (Until 1 PM)" && current < 13 * 60) continue;
        if (dayOff.duration === "Afternoon (After 1 PM)" && current >= 13 * 60) continue;
      }

      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const p = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const label12 = `${h12}:${String(m).padStart(2, "0")} ${p}`;
      const isBooked = bookedTimes.has(timeStr);

      slots.push({
        hour: h,
        minute: m,
        timeStr,
        label12,
        isBooked,
      });
    }

    return {
      generatedSlots: slots,
      slotDuration: duration,
      dayOffNotice: null,
    };
  }, [values.provider, values.date, values.location, values.serviceId, allAvailableServices, orgLocations, activeOrganization.id]);

  // Auto-sync sessionType with location (online/virtual -> video, physical branch -> inPerson)
  useEffect(() => {
    if (values.location) {
      const isOnline = values.location.toLowerCase() === "online" || values.location.toLowerCase().includes("virtual");
      const expectedSessionType = isOnline ? "video" : "inPerson";
      if (values.sessionType !== expectedSessionType) {
        onChange({ sessionType: expectedSessionType });
      }
    }
  }, [values.location, values.sessionType]);

  // Auto-select first available slot if current slot is invalid or not in generated slots
  useEffect(() => {
    if (generatedSlots.length > 0) {
      const matchesCurrent = generatedSlots.some(
        (s) => s.hour === values.startHour && s.minute === values.startMinute && !s.isBooked
      );
      if (!matchesCurrent) {
        const firstAvail = generatedSlots.find((s) => !s.isBooked);
        if (firstAvail) {
          onChange({ startHour: firstAvail.hour, startMinute: firstAvail.minute });
        }
      }
    }
  }, [generatedSlots, values.startHour, values.startMinute]);

  // ── Handlers ──
  const handleServiceSelect = (serviceId: string) => {
    const srv = allAvailableServices.find((s) => String(s.id) === serviceId);
    if (srv) {
      const li: InvoiceLineItem = {
        id: `li-${Date.now()}`, source: "service", serviceId: String(srv.id),
        description: srv.name, quantity: 1, unitPrice: srv.price, taxPercent: srv.tax || 0,
      };
      const patientName = values.client?.name?.trim();

      // Check if current provider is valid for newly selected service & location
      let nextProvider = values.provider;
      if (srv.assignedEmployees && srv.assignedEmployees.length > 0) {
        const assignedIds = new Set(srv.assignedEmployees.map(String));
        const validEmps = allEmployeesList.filter(
          (emp) => assignedIds.has(String(emp.id))
        );
        const isCurrentValid = values.provider && validEmps.some((e) => String(e.id) === String(values.provider?.id) || e.name.toLowerCase() === values.provider?.name?.toLowerCase());
        if (!isCurrentValid) {
          nextProvider = validEmps.length > 0 ? validEmps[0] : null;
        }
      }

      onChange({
        serviceId: String(srv.id), serviceName: srv.name,
        title: patientName ? `${srv.name} — ${patientName}` : `${srv.name} Appointment`,
        generateInvoice: values.generateInvoice !== undefined ? values.generateInvoice : hasAppointmentInvoiceAutomation(values.processId),
        lineItems: [li],
        provider: nextProvider,
      });
    } else {
      onChange({ serviceId: "", serviceName: "", lineItems: [] });
    }
  };

  const handleLocationSelect = (locName: string) => {
    const isOnline = locName.toLowerCase() === "online";
    const patch: Partial<BookingFormValues> = {
      location: locName,
      sessionType: isOnline ? "video" : "inPerson",
    };

    // Auto-adjust provider if not valid for location
    if (locName && locName.toLowerCase() !== "online" && values.provider) {
      const validEmps = availableEmployeesForServiceAndLocation;
      const isValid = validEmps.some((e) => String(e.id) === String(values.provider?.id) || e.name.toLowerCase() === values.provider?.name?.toLowerCase());
      if (!isValid && validEmps.length > 0) {
        patch.provider = validEmps[0];
      }
    }

    onChange(patch);
  };

  const handleClientSelect = (clientId: string) => {
    const cl = allAvailableClients.find((x) => String(x.id) === clientId);
    const srvName = values.serviceName || allAvailableServices.find((s) => String(s.id) === values.serviceId)?.name;
    const patch: Partial<BookingFormValues> = { client: cl || null };
    if (cl) patch.title = srvName ? `${srvName} — ${cl.name}` : `Appointment — ${cl.name}`;
    onChange(patch);
  };

  // ── Validation ──
  const isServiceComplete = Boolean(values.serviceId || values.serviceName);
  const isLocationComplete = Boolean(values.location && values.location.trim());
  const isParticipantsComplete = Boolean(values.client && values.provider);
  const isScheduleComplete = Boolean(values.date);
  const isFormComplete = isServiceComplete && isLocationComplete && isParticipantsComplete && isScheduleComplete;

  const summaryText = isFormComplete
    ? `${values.sessionType === "video" ? "Online Video" : values.location} · ${fmtShortDate()} · ${fmt12(values.startHour, values.startMinute)} – ${fmt12(endHour, endMin)} · ${values.client?.name} with ${values.provider?.name}`
    : "";

  // ── Dropdown option builders ──
  const clientOptions: DropdownOption[] = [
    { value: "", label: `Select a client` },
    ...allAvailableClients.map((cl) => ({
      value: String(cl.id),
      label: cl.name,
      meta: cl.phone || cl.email || undefined,
    })),
  ];

  const providerOptions: DropdownOption[] = [
    { value: "", label: values.serviceId || values.location ? "Select assigned doctor / provider" : "Select a user" },
    ...availableEmployeesForServiceAndLocation.map((e) => ({ value: String(e.id), label: e.name, meta: e.email })),
  ];

  const serviceOptions: DropdownOption[] = [
    { value: "", label: "Select a service" },
    ...allAvailableServices.map((s) => ({
      value: String(s.id),
      label: s.name,
      meta: `$${s.price} · ${s.duration} min`,
    })),
  ];

  const locationOptions: DropdownOption[] = [
    { value: "", label: "Select a location" },
    ...orgLocations.map((loc) => {
      const isOnline = loc.type === "online" || loc.name.toLowerCase() === "online";
      return {
        value: loc.name,
        label: loc.name,
        meta: isOnline ? "Online (Video Call)" : (loc.address || "In-Person Clinic"),
      };
    }),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-full sm:max-w-[40vw]"
      title={
        <div>
          <h2 className="text-[17px] font-semibold text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {mode === "reschedule" ? "Reschedule Appointment" : "Schedule Appointment"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {mode === "reschedule" ? "Update the appointment details" : "Create a new appointment with a client"}
          </p>
        </div>
      }
      footer={
        <div className="space-y-2.5">
          {isFormComplete && summaryText && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-slate-600 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{summaryText}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!isFormComplete || isSaving || (mode !== "reschedule" && !appointmentAutomationConfigured)}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                backgroundColor: isFormComplete && !isSaving && (mode === "reschedule" || appointmentAutomationConfigured) ? "#181e25" : "#e2e8f0",
                color: isFormComplete && !isSaving && (mode === "reschedule" || appointmentAutomationConfigured) ? "#ffffff" : "#94a3b8",
                cursor: isFormComplete && !isSaving && (mode === "reschedule" || appointmentAutomationConfigured) ? "pointer" : "not-allowed",
              }}
              title={mode !== "reschedule" && !appointmentAutomationConfigured ? "Please build the automation first" : undefined}
            >
              {isSaving ? "Saving..." : mode === "reschedule" ? "Save Changes" : "Book Appointment"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 pb-4">
        {mode !== "reschedule" && !appointmentAutomationConfigured && (
          <div className="px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-medium text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Appointment booking is locked — please build the automation first in the Automation page.
            </span>
            <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
              Build automation &rarr;
            </Link>
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 1 — SERVICE                                              */}
        {/* ================================================================ */}
        <SectionCard>
          <SectionHeader title="1. Service" />
          <div className="p-3">
            <FieldRow label="Select Service" required>
              <CustomDropdown
                value={values.serviceId || ""}
                options={serviceOptions}
                placeholder="Select a service"
                onChange={handleServiceSelect}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ================================================================ */}
        {/* SECTION 2 — LOCATION                                             */}
        {/* ================================================================ */}
        <SectionCard>
          <SectionHeader title="2. Location" />
          <div className="p-3">
            <FieldRow label="Select Location" required>
              <CustomDropdown
                value={values.location || ""}
                options={locationOptions}
                placeholder="Select location (Clinic branch or Online)"
                onChange={handleLocationSelect}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ================================================================ */}
        {/* SECTION 3 — PARTICIPANTS                                         */}
        {/* ================================================================ */}
        <SectionCard>
          <SectionHeader title="3. Participants" />
          <div className="p-3 space-y-1">
            <FieldRow label="Schedule For" required>
              <CustomDropdown
                value={values.client ? String(values.client.id) : ""}
                options={clientOptions}
                placeholder="Select a client"
                onChange={handleClientSelect}
              />
            </FieldRow>
            <FieldRow label="Schedule With (Responsible Staff)" required>
              <CustomDropdown
                value={values.provider ? String(values.provider.id) : ""}
                options={providerOptions}
                placeholder={
                  values.serviceId || values.location
                    ? "Select assigned doctor / provider"
                    : "Select a user"
                }
                onChange={(val) => {
                  const emp = allEmployeesList.find((x) => String(x.id) === val);
                  onChange({ provider: emp || null });
                }}
              />
            </FieldRow>

            {/* Auto-allocated Room Box — displayed after mapping Service, Location, and Responsible Staff */}
            {values.sessionType !== "video" && values.location && values.serviceId && values.provider && (
              allocatedRoom ? (
                <div className="mt-2.5 p-2.5 rounded-lg border border-blue-200/80 bg-blue-50/60 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    #{allocatedRoom.roomNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{allocatedRoom.name}</span>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60">
                        Auto-allocated Room
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        • {allocatedRoom.location}
                      </span>
                    </div>
                    {allocatedRoom.direction && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        <strong className="text-slate-700">Directions:</strong> {allocatedRoom.direction}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 p-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span style={{ fontFamily: "DM Sans, sans-serif" }}>
                    No room mapped for this location, service & responsible provider.
                  </span>
                </div>
              )
            )}
          </div>
        </SectionCard>

        {/* ================================================================ */}
        {/* SECTION 4 — SCHEDULE                                             */}
        {/* ================================================================ */}
        <SectionCard>
          <SectionHeader title="4. Schedule" />
          <div className="p-3 space-y-1">

            {/* Date */}
            <FieldRow label="Date" required>
              <input
                type="date"
                value={values.date}
                onChange={(e) => onChange({ date: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </FieldRow>

            {/* Available Slots */}
            <FieldRow label="Available Slots" required>
              {!values.provider ? (
                <div className="py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Select a responsible staff member under Participants to view available slots.
                </div>
              ) : !values.date ? (
                <div className="py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Select an appointment date above to view available time slots.
                </div>
              ) : generatedSlots.length === 0 ? (
                <div className="py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{dayOffNotice || `No open slots found for ${values.provider.name} on this date.`}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {generatedSlots.map((slot) => {
                      const isSelected = values.startHour === slot.hour && values.startMinute === slot.minute;
                      return (
                        <button
                          key={`${slot.hour}:${slot.minute}`}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => onChange({ startHour: slot.hour, startMinute: slot.minute })}
                          className={`py-1.5 px-2 rounded-lg text-xs transition-all text-center ${
                            isSelected
                              ? "bg-slate-900 text-white font-semibold shadow-xs"
                              : slot.isBooked
                              ? "bg-slate-100 text-slate-400 border border-slate-200/60 line-through cursor-not-allowed opacity-60"
                              : "bg-slate-50/80 hover:bg-white text-slate-700 border border-slate-200 hover:border-slate-300 font-medium"
                          }`}
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                          title={slot.isBooked ? "Slot already booked" : `${slot.label12} (${slotDuration} min)`}
                        >
                          {slot.label12}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Selected Time: <strong className="text-slate-900 font-semibold">{fmt12(values.startHour, values.startMinute)} – {fmt12(endHour, endMin)}</strong>
                      </span>
                    </span>
                    <span className="text-slate-400 font-medium">{slotDuration} min</span>
                  </div>
                </div>
              )}
            </FieldRow>

            {/* Real-time Provider Location & Day Off Notice */}
            {providerAvailabilityNotice && (
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                  providerAvailabilityNotice.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50/70 border-emerald-200/80 text-emerald-900"
                }`}
              >
                {providerAvailabilityNotice.type === "warning" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{providerAvailabilityNotice.message}</span>
              </div>
            )}
          </div>
        </SectionCard>

      </div>
    </CustomSideDrawer>
  );
}
