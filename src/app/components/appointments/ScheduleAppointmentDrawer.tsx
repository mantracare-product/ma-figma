import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getStoredServices, onServicesChanged } from "../../../lib/servicesStore";
import { useTeamMembers } from "../../../lib/teamStore";
import { InvoiceLineItem } from "../../types/invoiceTypes";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Receipt,
  CheckCircle2,
  MapPin,
  Video,
  Building2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { initialClients } from "../../pages/ClientProfile";
import { useOrganization } from "../../context/OrganizationContext";
import { CustomSideDrawer } from "../ui/drawer";
import { FieldDefinition } from "../../context/FieldRegistryContext";

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
  primaryInsurance?: string;
  secondaryInsurance?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INSURANCE_PROVIDERS = [
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "Medicare",
  "Humana",
  "Kaiser Permanente",
  "Self-Pay",
];

const SECONDARY_PROVIDERS = [
  "None",
  "Medicare Part B",
  "Medicaid",
  "Aetna Supplemental",
  "Cigna Dental/Vision",
  "UnitedHealthcare Supplemental",
];

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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="p-2 rounded-lg hover:bg-slate-50/60 transition-colors">
    <label
      className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      {label}
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
  const [insuranceSectionExpanded, setInsuranceSectionExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [invoiceSectionExpanded, setInvoiceSectionExpanded] = useState(false);
  const [primaryInsurance, setPrimaryInsurance] = useState(values.primaryInsurance || "Blue Cross Blue Shield");
  const [hasSecondaryInsurance, setHasSecondaryInsurance] = useState(
    Boolean(values.secondaryInsurance && values.secondaryInsurance !== "None")
  );
  const [secondaryInsurance, setSecondaryInsurance] = useState(values.secondaryInsurance || "Medicare Part B");

  // ── Available clients ──
  const allAvailableClients: ClientOption[] = useMemo(() => {
    const list: ClientOption[] = [];
    const seenIds = new Set<string>();

    if (clients?.length) {
      clients.forEach((c) => {
        if (!seenIds.has(String(c.id))) { seenIds.add(String(c.id)); list.push(c); }
      });
    }

    try {
      const raw = sessionStorage.getItem("clients");
      const loaded = raw ? JSON.parse(raw) : initialClients;
      if (Array.isArray(loaded)) {
        loaded.forEach((c: any) => {
          if (!seenIds.has(String(c.id))) {
            seenIds.add(String(c.id));
            list.push({
              id: c.id, name: c.name, email: c.email || "", phone: c.phone || "",
              status: c.status,
              process: Array.isArray(c.processes) ? c.processes[0] : c.processes,
            });
          }
        });
      }
    } catch { /* ignore */ }

    if (values.client && !seenIds.has(String(values.client.id))) list.unshift(values.client);
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [clients, values.client]);

  const { teamMembers } = useTeamMembers();

  // Combine employees prop with teamMembers store
  const allEmployeesList: Employee[] = useMemo(() => {
    const list: Employee[] = employees ? [...employees] : [];
    const seenIds = new Set(list.map((e) => String(e.id)));
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((m) => {
        if (!seenIds.has(String(m.id))) {
          seenIds.add(String(m.id));
          list.push({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role || m.department || "Staff",
            locations: m.locations || (m as any).availableLocations || [],
          } as any);
        }
      });
    }
    return list;
  }, [employees, teamMembers]);

  // Live services sync from store
  const [storedServicesState, setStoredServicesState] = useState(getStoredServices);

  useEffect(() => {
    return onServicesChanged(() => setStoredServicesState(getStoredServices()));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStoredServicesState(getStoredServices());
    }
  }, [isOpen]);

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
    const list: Array<{ id: string; name: string; address?: string; phone?: string; timezone?: string }> = [];
    const seen = new Set<string>();

    try {
      const saved = localStorage.getItem(`mantra_org_locations_${activeOrganization.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((l: any) => {
            if (!seen.has(l.name.toLowerCase())) {
              seen.add(l.name.toLowerCase());
              list.push({
                id: l.id,
                name: l.name,
                address: l.address,
                phone: l.phone,
                timezone: l.timezone,
              });
            }
          });
        }
      }
    } catch { /* ignore */ }

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
          address: isOnline ? "Virtual / Telehealth Consultation" : idx === 0 ? "123 Healthcare Ave, Suite 100" : "450 Lexington Ave, Suite 240",
        });
      }
    });

    if (!list.some((l) => l.name.toLowerCase() === "online")) {
      list.push({ id: "loc-online", name: "Online", address: "Virtual / Telehealth Consultation" });
    }

    return list;
  }, [activeOrganization]);

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
        generateInvoice: values.generateInvoice ?? true, lineItems: [li],
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

  const handleAddManualLineItem = () => {
    onChange({
      lineItems: [...(values.lineItems || []), {
        id: `li-${Date.now()}`, source: "manual",
        description: "Additional Consultation / Service", quantity: 1, unitPrice: 50, taxPercent: 0,
      }],
    });
  };

  const handleUpdateLineItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    const current = [...(values.lineItems || [])];
    if (current[index]) { current[index] = { ...current[index], ...patch }; onChange({ lineItems: current }); }
  };

  const handleRemoveLineItem = (index: number) => {
    const current = [...(values.lineItems || [])];
    current.splice(index, 1);
    onChange({ lineItems: current });
  };

  // ── Invoice calculations ──
  const currentLineItems = values.lineItems || [];
  const subtotal = currentLineItems.reduce((s, i) => s + (i.unitPrice * i.quantity - (i.discountAmount || 0)), 0);
  const discount = values.discountAmount || 0;
  const taxSum = currentLineItems.reduce((acc, item) => {
    const itemSub = Math.max(0, item.unitPrice * item.quantity - (item.discountAmount || 0));
    const effDisc = subtotal > 0 ? discount * (itemSub / subtotal) : 0;
    return acc + (Math.max(0, itemSub - effDisc) * (item.taxPercent ?? 0)) / 100;
  }, 0);
  const tax = Math.round(taxSum * 100) / 100;
  const total = Math.round((Math.max(0, subtotal - discount) + tax) * 100) / 100;

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
    ...orgLocations.map((loc) => ({
      value: loc.name,
      label: loc.name,
      meta: loc.address || undefined,
    })),
  ];

  const processOptions: DropdownOption[] = [
    { value: "", label: "Select a process" },
    ...Object.keys(processStages).map((p) => ({ value: p, label: p })),
  ];

  const stageOptions: DropdownOption[] = [
    { value: "", label: "Select a stage" },
    ...(processStages[values.processId] || []).map((s) => ({ value: s, label: s })),
  ];

  const primaryInsOpts: DropdownOption[] = INSURANCE_PROVIDERS.map((i) => ({ value: i, label: i }));
  const secondaryInsOpts: DropdownOption[] = SECONDARY_PROVIDERS.map((s) => ({ value: s, label: s }));

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
              disabled={!isFormComplete || isSaving}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                backgroundColor: isFormComplete && !isSaving ? "#181e25" : "#e2e8f0",
                color: isFormComplete && !isSaving ? "#ffffff" : "#94a3b8",
                cursor: isFormComplete && !isSaving ? "pointer" : "not-allowed",
              }}
            >
              {isSaving ? "Saving..." : mode === "reschedule" ? "Save Changes" : "Book Appointment"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 pb-4">

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

            {/* Time */}
            <FieldRow label="Time (client timezone)" required>
              {!values.client ? (
                <p className="text-xs text-slate-400 py-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Select a client to enable time selection
                </p>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    {/* Start time */}
                    <div className="flex items-center gap-1 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-slate-400 transition-all">
                      <input
                        type="number" min={0} max={23}
                        value={values.startHour}
                        onChange={(e) => onChange({ startHour: Math.min(23, Math.max(0, Number(e.target.value))) })}
                        className="w-8 text-center bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      />
                      <span className="text-slate-400 text-xs">:</span>
                      <input
                        type="number" min={0} max={59}
                        value={values.startMinute}
                        onChange={(e) => onChange({ startMinute: Math.min(59, Math.max(0, Number(e.target.value))) })}
                        className="w-8 text-center bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      />
                    </div>

                    <span className="text-slate-400 text-xs">→</span>

                    {/* End time (read-only) */}
                    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-semibold text-slate-400" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {pad(endHour)}:{pad(endMin)}
                      </span>
                    </div>
                  </div>
                  {values.date && (
                    <p className="text-[11px] text-slate-400 mt-1.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {fmtTime(startHHMM)} – {fmtTime(endHHMM)}
                    </p>
                  )}
                </div>
              )}
            </FieldRow>

            {/* Session type */}
            <FieldRow label="Session Type" required>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onChange({ sessionType: "video", location: "Online" })}
                  className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    values.sessionType === "video" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ sessionType: "inPerson", location: values.location && values.location.toLowerCase() !== "online" ? values.location : orgLocations[0]?.name || "Main Clinic" })}
                  className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 border-l border-slate-200 transition-colors ${
                    values.sessionType === "inPerson" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  In-Person
                </button>
              </div>
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

        {/* ================================================================ */}
        {/* SECTION 4 — WORKFLOW                                             */}
        {/* ================================================================ */}
        <SectionCard>
          <SectionHeader title="Workflow" />
          <div className="p-3 space-y-1">
            <FieldRow label="Process">
              <CustomDropdown
                value={values.processId}
                options={processOptions}
                placeholder="Select a process"
                onChange={(val) => onChange({ processId: val, stageId: "" })}
              />
            </FieldRow>
            <FieldRow label="Stage">
              <CustomDropdown
                value={values.stageId}
                options={stageOptions}
                placeholder="Select a stage"
                onChange={(val) => onChange({ stageId: val })}
                disabled={!values.processId}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ================================================================ */}
        {/* SECTION 5 — INSURANCE & BILLING (collapsed)                      */}
        {/* ================================================================ */}
        <SectionCard>
          <button
            type="button"
            onClick={() => setInsuranceSectionExpanded(!insuranceSectionExpanded)}
            className="w-full px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors"
          >
            <h3
              className="text-xs font-bold text-slate-600 uppercase tracking-wider"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Insurance & Billing
            </h3>
            {insuranceSectionExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>

          {insuranceSectionExpanded && (
            <div className="p-3 space-y-1">
              <FieldRow label="Primary Insurance">
                <CustomDropdown
                  value={primaryInsurance}
                  options={primaryInsOpts}
                  placeholder="Select insurance"
                  onChange={(val) => { setPrimaryInsurance(val); onChange({ primaryInsurance: val }); }}
                />
              </FieldRow>

              <div className="p-2 rounded-lg hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="sec-ins"
                    checked={hasSecondaryInsurance}
                    onChange={(e) => {
                      setHasSecondaryInsurance(e.target.checked);
                      onChange({ secondaryInsurance: e.target.checked ? secondaryInsurance : undefined });
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-slate-700"
                  />
                  <label
                    htmlFor="sec-ins"
                    className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Secondary Insurance
                  </label>
                </div>

                {hasSecondaryInsurance && (
                  <div className="mt-2">
                    <CustomDropdown
                      value={secondaryInsurance}
                      options={secondaryInsOpts}
                      placeholder="Select secondary insurance"
                      onChange={(val) => { setSecondaryInsurance(val); onChange({ secondaryInsurance: val }); }}
                    />
                  </div>
                )}
              </div>

              {/* Invoice Details (nested collapsible) */}
              <div className="border-t border-slate-100 pt-2 mt-1">
                <button
                  type="button"
                  onClick={() => setInvoiceSectionExpanded(!invoiceSectionExpanded)}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Invoice Details
                    </span>
                  </div>
                  {invoiceSectionExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  }
                </button>

                {invoiceSectionExpanded && (
                  <div className="mt-2 space-y-3 px-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-700" style={{ fontFamily: "DM Sans, sans-serif" }}>Generate invoice on booking</p>
                      <input
                        type="checkbox"
                        checked={values.generateInvoice ?? true}
                        onChange={(e) => onChange({ generateInvoice: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-slate-700"
                      />
                    </div>

                    {values.generateInvoice && (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                              Line Items
                            </span>
                            <button
                              type="button"
                              onClick={handleAddManualLineItem}
                              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 font-medium transition-colors"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              <Plus className="w-3 h-3" /> Add item
                            </button>
                          </div>

                          {currentLineItems.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateLineItem(idx, { description: e.target.value })}
                                placeholder="Description"
                                className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              />
                              <span className="text-slate-200">|</span>
                              <input
                                type="number" min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateLineItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-8 text-center bg-transparent outline-none text-slate-600"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              />
                              <span className="text-slate-200">×</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-slate-400">$</span>
                                <input
                                  type="number" min={0}
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateLineItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-14 text-right bg-transparent outline-none text-slate-700"
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                />
                              </div>
                              <button type="button" onClick={() => handleRemoveLineItem(idx)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500" style={{ fontFamily: "DM Sans, sans-serif" }}>Discount ($)</span>
                          <input
                            type="number" min={0}
                            value={values.discountAmount || 0}
                            onChange={(e) => onChange({ discountAmount: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 text-right border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-400"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          />
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-semibold text-slate-700">${subtotal.toFixed(2)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600">
                              <span>Discount</span>
                              <span>−${discount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Tax</span>
                            <span>${tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-semibold text-slate-800">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ================================================================ */}
        {/* SECTION 6 — ADDITIONAL DETAILS (collapsed)                       */}
        {/* ================================================================ */}
        <SectionCard>
          <button
            type="button"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="w-full px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors"
          >
            <h3
              className="text-xs font-bold text-slate-600 uppercase tracking-wider"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Additional Details
            </h3>
            {detailsExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>

          {detailsExpanded && (
            <div className="p-3 space-y-1">
              <FieldRow label="Title" required>
                <FieldInput
                  type="text"
                  placeholder="e.g., Follow-up — Sarah Johnson"
                  value={values.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                />
              </FieldRow>

              <FieldRow label="Description">
                <textarea
                  placeholder="Add appointment description..."
                  value={values.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 resize-none transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </FieldRow>

              <FieldRow label="Note">
                <FieldInput
                  type="text"
                  placeholder="Quick note for clinical staff..."
                  value={values.note}
                  onChange={(e) => onChange({ note: e.target.value })}
                />
              </FieldRow>

              <FieldRow label="Tags">
                <FieldInput
                  type="text"
                  placeholder="follow-up, urgent, specialist"
                  value={values.tags}
                  onChange={(e) => onChange({ tags: e.target.value })}
                />
              </FieldRow>

              {/* Custom Fields */}
              {(visibleCustomFieldKeys.length > 0 || customFields.length > 0) && (
                <div className="border-t border-slate-100 pt-2 mt-1">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <label
                      className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Custom Fields
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onOpenSelectFields}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Select Fields
                      </button>
                      <button
                        type="button"
                        onClick={onOpenCreateField}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        + Create Field
                      </button>
                    </div>
                  </div>
                  {customFields
                    .filter((f) => visibleCustomFieldKeys.includes(f.key))
                    .map((f) => (
                      <FieldRow key={f.key} label={f.label} required={f.required}>
                        <FieldInput
                          type="text"
                          value={customFieldValues[f.key] || ""}
                          onChange={(e) => onCustomFieldChange(f.key, e.target.value)}
                          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                        />
                      </FieldRow>
                    ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>

      </div>
    </CustomSideDrawer>
  );
}
