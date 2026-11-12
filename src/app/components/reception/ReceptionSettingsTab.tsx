/**
 * ReceptionSettingsTab.tsx
 * Path: src/app/components/reception/ReceptionSettingsTab.tsx
 *
 * Centralized AI Receptionist Settings inside Client Settings:
 * 1. Kiosk & Terminals: Clinic & persona branding, Kiosk feature toggles, and Multi-terminal Launch
 * 2. Clinic Rooms & Desks: Unified PageTopBar + TableComponent combining Products & Services rooms (with attached service) and standalone AI Receptionist rooms (no product/service attached)
 * 3. Queue & Onboarding Rules: Arrival windows, anti-starvation aging cap, and default onboarding process (without token numbering prefixes)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Sliders,
  Sparkles,
  Monitor,
  ExternalLink,
  RefreshCw,
  Save,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { PageTopBar } from "../layout/PageTopBar";
import DrawerShell from "../ui/DrawerShell";
import { TableComponent, type TableColumn, type TableRowAction } from "../ui/TableComponent";
import {
  getStoredRooms,
  updateRoom,
  deleteRoom,
  ROOMS_CHANGED_EVENT,
  type Room,
} from "../../../lib/roomsStore";
import {
  DEFAULT_RECEPTION_FEATURES,
  DEFAULT_RECEPTION_ORG_ID,
  buildDefaultReceptionConfig,
  getStoredReceptionConfig,
  saveReceptionConfig,
} from "../../../lib/receptionSettingsStore";
import type {
  Station,
  ReceptionConfig,
  ReceptionFeatureFlags,
  ReceptionTerminal,
  StationType,
} from "../../../reception/types/reception";

const STATIONS_STORAGE_KEY = "ma_reception_stations";

const KIOSK_FEATURE_LIST: Array<{
  key: keyof ReceptionFeatureFlags;
  label: string;
  description: string;
}> = [
  { key: "walkIn", label: "Walk-in", description: "Allow walk-in registration from the kiosk" },
  { key: "faceCheckin", label: "Face check-in", description: "Show face recognition check-in" },
  { key: "qrCheckin", label: "QR check-in", description: "Allow scanning appointment QR codes" },
  { key: "voice", label: "Voice", description: "Enable voice intents on the avatar" },
  { key: "payments", label: "Payments", description: "Show pay-my-bill entry points" },
  { key: "printToken", label: "Print token", description: "Offer printed queue tokens" },
];

type RoomSource = "services" | "reception";

interface UnifiedRoomRow {
  rowKey: string;
  id: string;
  source: RoomSource;
  name: string;
  roomNumber?: string;
  stationType?: StationType;
  location?: string;
  direction?: string;
  serviceName?: string;
  providerName?: string;
  active: boolean;
}

export default function ReceptionSettingsTab() {
  const { activeOrganization } = useOrganization();
  const orgId = activeOrganization?.id || DEFAULT_RECEPTION_ORG_ID;

  const orgMeta = useMemo(
    () => ({
      name: activeOrganization?.name,
      phone: activeOrganization?.phone,
      email: activeOrganization?.email,
    }),
    [activeOrganization?.name, activeOrganization?.phone, activeOrganization?.email]
  );

  const [subTab, setSubTab] = useState<"general" | "rooms">("general");
  const [isDirty, setIsDirty] = useState(false);

  // --- Centralized Rooms State (Products & Services rooms + AI Receptionist standalone rooms) ---
  const [serviceRooms, setServiceRooms] = useState<Room[]>(getStoredRooms);
  const [receptionStations, setReceptionStations] = useState<Station[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [roomSourceFilter, setRoomSourceFilter] = useState<"all" | "services" | "reception" | "active">("all");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<UnifiedRoomRow | null>(null);
  const [roomFormData, setRoomFormData] = useState<{
    name: string;
    type: StationType;
    roomNumber: string;
    location: string;
    direction: string;
    providerName: string;
    active: boolean;
  }>({
    name: "",
    type: "doctor_room",
    roomNumber: "",
    location: "",
    direction: "",
    providerName: "",
    active: true,
  });

  // --- Centralized AI Receptionist Config State ---
  const [config, setConfig] = useState<ReceptionConfig>(() =>
    buildDefaultReceptionConfig(orgId, orgMeta)
  );

  const loadStations = useCallback(() => {
    try {
      const saved = localStorage.getItem(STATIONS_STORAGE_KEY);
      if (saved) setReceptionStations(JSON.parse(saved));
    } catch (err) {
      console.error("Failed to load reception stations:", err);
    }
  }, []);

  const loadSettingsFromStore = useCallback(
    (showToast = false) => {
      loadStations();
      setServiceRooms(getStoredRooms());
      setConfig(getStoredReceptionConfig(orgId, orgMeta));
      setIsDirty(false);
      if (showToast) {
        toast.success("AI Receptionist settings refreshed");
      }
    },
    [loadStations, orgId, orgMeta]
  );

  useEffect(() => {
    loadSettingsFromStore(false);
  }, [loadSettingsFromStore]);

  useEffect(() => {
    const syncRooms = () => setServiceRooms(getStoredRooms());
    window.addEventListener(ROOMS_CHANGED_EVENT, syncRooms);
    window.addEventListener("storage", syncRooms);
    return () => {
      window.removeEventListener(ROOMS_CHANGED_EVENT, syncRooms);
      window.removeEventListener("storage", syncRooms);
    };
  }, []);

  // Merge Products & Services rooms + standalone AI Receptionist rooms without duplicates
  const unifiedRooms = useMemo<UnifiedRoomRow[]>(() => {
    const serviceIds = new Set(serviceRooms.map((r) => r.id));
    const serviceNumbers = new Set(
      serviceRooms
        .map((r) => (r.roomNumber || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const mappedServiceRooms: UnifiedRoomRow[] = serviceRooms.map((rm) => ({
      rowKey: `svc:${rm.id}`,
      id: rm.id,
      source: "services",
      name: rm.name,
      roomNumber: rm.roomNumber,
      location: rm.location,
      direction: rm.direction,
      serviceName: rm.serviceName || undefined,
      providerName: rm.responsibleName || undefined,
      active: rm.isActive !== false,
    }));

    // Only keep reception stations that are NOT mirrors of Products & Services rooms;
    // rooms configured at AI Receptionist never carry an attached product or service.
    const mappedReceptionRooms: UnifiedRoomRow[] = receptionStations
      .filter((st) => {
        if (serviceIds.has(st.id)) return false;
        const rn = (st.roomNumber || "").trim().toLowerCase();
        if (rn && serviceNumbers.has(rn)) return false;
        return true;
      })
      .map((st) => ({
        rowKey: `rec:${st.id}`,
        id: st.id,
        source: "reception",
        name: st.name,
        roomNumber: st.roomNumber,
        stationType: st.type,
        location: st.floorWing,
        direction: st.directions,
        serviceName: undefined,
        providerName: st.providerName,
        active: st.active,
      }));

    return [...mappedReceptionRooms, ...mappedServiceRooms];
  }, [serviceRooms, receptionStations]);

  const filteredRooms = useMemo(() => {
    const q = roomSearchQuery.trim().toLowerCase();
    return unifiedRooms.filter((rm) => {
      if (roomSourceFilter === "services" && rm.source !== "services") return false;
      if (roomSourceFilter === "reception" && rm.source !== "reception") return false;
      if (roomSourceFilter === "active" && !rm.active) return false;

      if (!q) return true;
      return (
        rm.name.toLowerCase().includes(q) ||
        (rm.roomNumber || "").toLowerCase().includes(q) ||
        (rm.direction || "").toLowerCase().includes(q) ||
        (rm.location || "").toLowerCase().includes(q) ||
        (rm.providerName || "").toLowerCase().includes(q) ||
        (rm.serviceName || "").toLowerCase().includes(q)
      );
    });
  }, [unifiedRooms, roomSearchQuery, roomSourceFilter]);

  const persistStations = (updated: Station[]) => {
    setReceptionStations(updated);
    localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
  };

  const persistConfig = (nextConfig: ReceptionConfig, message = "AI Receptionist settings saved") => {
    try {
      saveReceptionConfig(orgId, nextConfig);
      setConfig({ ...nextConfig, orgId });
      setIsDirty(false);
      toast.success(message);
    } catch (err) {
      console.error("Failed to save reception config:", err);
      toast.error("Failed to save settings");
    }
  };

  const updateDraft = (updater: (prev: ReceptionConfig) => ReceptionConfig) => {
    setConfig((prev) => updater(prev));
    setIsDirty(true);
  };

  const handleToggleFeature = (key: keyof ReceptionFeatureFlags) => {
    updateDraft((prev) => {
      const currentFeatures = prev.features || DEFAULT_RECEPTION_FEATURES;
      return {
        ...prev,
        features: {
          ...currentFeatures,
          [key]: !currentFeatures[key],
        },
      };
    });
  };

  const handleAddTerminal = () => {
    updateDraft((prev) => {
      const existing = prev.terminals || [];
      const nextNum = existing.length + 1;
      return {
        ...prev,
        terminals: [
          ...existing,
          {
            id: `term_${Date.now()}`,
            name: `Reception Terminal ${nextNum}`,
            locationLabel: `Desk ${nextNum}`,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const handleTerminalChange = (terminalId: string, field: "name" | "locationLabel", value: string) => {
    updateDraft((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).map((t) =>
        t.id === terminalId ? { ...t, [field]: value } : t
      ),
    }));
  };

  const handleRemoveTerminal = (terminalId: string) => {
    updateDraft((prev) => ({
      ...prev,
      terminals: (prev.terminals || []).filter((t) => t.id !== terminalId),
    }));
  };

  const handleLaunchTerminal = (terminal: ReceptionTerminal) => {
    saveReceptionConfig(orgId, config);
    const params = new URLSearchParams({
      terminal: terminal.id,
      terminalName: terminal.name || "Kiosk",
      location: terminal.locationLabel || "",
      org: orgId,
    });
    window.open(`/reception?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  // --- Room Actions ---
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      name: "",
      type: "doctor_room",
      roomNumber: "",
      location: "",
      direction: "",
      providerName: "",
      active: true,
    });
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (row: UnifiedRoomRow) => {
    setEditingRoom(row);
    setRoomFormData({
      name: row.name,
      type: row.stationType || "doctor_room",
      roomNumber: row.roomNumber || "",
      location: row.location || "",
      direction: row.direction || "",
      providerName: row.providerName || "",
      active: row.active,
    });
    setShowRoomModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.name.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    if (editingRoom?.source === "services") {
      updateRoom(editingRoom.id, {
        name: roomFormData.name.trim(),
        roomNumber: roomFormData.roomNumber.trim() || editingRoom.roomNumber || "",
        location: roomFormData.location.trim() || editingRoom.location || "",
        direction: roomFormData.direction.trim() || editingRoom.direction || "",
        responsibleName: roomFormData.providerName.trim() || undefined,
        isActive: roomFormData.active,
      });
      toast.success("Room updated successfully");
    } else if (editingRoom?.source === "reception") {
      const updated = receptionStations.map((s) =>
        s.id === editingRoom.id
          ? {
              ...s,
              name: roomFormData.name.trim(),
              type: roomFormData.type,
              roomNumber: roomFormData.roomNumber.trim() || undefined,
              floorWing: roomFormData.location.trim() || undefined,
              directions: roomFormData.direction.trim() || undefined,
              providerName: roomFormData.providerName.trim() || undefined,
              active: roomFormData.active,
            }
          : s
      );
      persistStations(updated);
      toast.success("Room updated successfully");
    } else {
      // Rooms configured directly in AI Receptionist never have a Product or Service attached
      const newStation: Station = {
        id: `room_${Date.now()}`,
        orgId,
        name: roomFormData.name.trim(),
        type: roomFormData.type,
        roomNumber: roomFormData.roomNumber.trim() || undefined,
        floorWing: roomFormData.location.trim() || undefined,
        directions: roomFormData.direction.trim() || undefined,
        providerName: roomFormData.providerName.trim() || undefined,
        active: roomFormData.active,
        createdAt: new Date().toISOString(),
      };
      persistStations([newStation, ...receptionStations]);
      toast.success("AI Receptionist room added (no service attached)");
    }

    setShowRoomModal(false);
  };

  const handleDeleteRoom = (row: UnifiedRoomRow) => {
    if (!confirm(`Remove "${row.name}"?`)) return;
    if (row.source === "services") {
      deleteRoom(row.id);
      toast.success("Room removed from Products & Services");
    } else {
      persistStations(receptionStations.filter((s) => s.id !== row.id));
      toast.success("Room removed");
    }
  };

  const handleToggleRoomStatus = (row: UnifiedRoomRow) => {
    if (row.source === "services") {
      updateRoom(row.id, { isActive: !row.active });
    } else {
      persistStations(
        receptionStations.map((s) => (s.id === row.id ? { ...s, active: !s.active } : s))
      );
    }
    toast.success(`Room ${!row.active ? "activated" : "disabled"}`);
  };

  const roomColumns: TableColumn<UnifiedRoomRow>[] = [
    {
      id: "name",
      header: "Room Label",
      minWidth: 200,
      render: (row) => (
        <span className="text-xs font-semibold text-gray-900">{row.name}</span>
      ),
    },
    {
      id: "roomNumber",
      header: "Room Number",
      minWidth: 130,
      render: (row) =>
        row.roomNumber ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 font-mono text-xs font-semibold text-gray-700">
            #{row.roomNumber}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      id: "direction",
      header: "Direction",
      minWidth: 260,
      render: (row) => (
        <span className="text-xs text-gray-700 line-clamp-2 max-w-md" title={row.direction || row.location || ""}>
          {row.direction || row.location || "—"}
        </span>
      ),
    },
    {
      id: "responsible",
      header: "Responsible",
      minWidth: 150,
      render: (row) => (
        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{row.providerName || "—"}</span>
      ),
    },
    {
      id: "active",
      header: "Active",
      minWidth: 110,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleRoomStatus(row);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
            row.active
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.active ? "bg-emerald-600" : "bg-gray-400"}`} />
          {row.active ? "Active" : "Inactive"}
        </button>
      ),
    },
  ];

  const getRoomRowActions = (row: UnifiedRoomRow): TableRowAction<UnifiedRoomRow>[] => [
    {
      label: "Edit Room",
      icon: <Edit className="w-3.5 h-3.5" />,
      onClick: handleOpenEditRoom,
    },
    {
      label: row.active ? "Disable Room" : "Activate Room",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      onClick: handleToggleRoomStatus,
    },
    {
      label: "Delete Room",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: handleDeleteRoom,
      isDanger: true,
    },
  ];

  const features = config.features || DEFAULT_RECEPTION_FEATURES;
  const terminals = config.terminals || [];
  const accentColor = /^#[0-9A-Fa-f]{6}$/.test(config.primaryColor || "") ? config.primaryColor! : "#2f2447";

  return (
    <div className="w-full space-y-7 pb-8">
      {/* Unified PageTopBar Switcher + Search/Filters + Primary Actions */}
      <PageTopBar
        modes={[
          {
            id: "general",
            label: "Kiosk & Terminals",
            icon: <Monitor className="w-3.5 h-3.5 text-[#1456f0]" />,
          },
          {
            id: "rooms",
            label: "Clinic Rooms & Desks",
            icon: <Building2 className="w-3.5 h-3.5 text-[#1456f0]" />,
            badge: unifiedRooms.length,
          },
        ]}
        activeMode={subTab}
        onModeChange={(mode) => setSubTab(mode as "general" | "rooms")}
        showSearch={subTab === "rooms"}
        searchQuery={roomSearchQuery}
        onSearchChange={setRoomSearchQuery}
        searchPlaceholder="Search rooms, room #, providers, locations, or services..."
        resultsCount={filteredRooms.length}
        filterPresets={
          subTab === "rooms"
            ? [
                {
                  id: "all",
                  label: "All Rooms",
                  count: unifiedRooms.length,
                  isActive: roomSourceFilter === "all",
                  onClick: () => setRoomSourceFilter("all"),
                },
                {
                  id: "services",
                  label: "Products & Services",
                  count: unifiedRooms.filter((r) => r.source === "services").length,
                  isActive: roomSourceFilter === "services",
                  onClick: () => setRoomSourceFilter("services"),
                },
                {
                  id: "reception",
                  label: "AI Receptionist",
                  count: unifiedRooms.filter((r) => r.source === "reception").length,
                  isActive: roomSourceFilter === "reception",
                  onClick: () => setRoomSourceFilter("reception"),
                },
                {
                  id: "active",
                  label: "Active Only",
                  count: unifiedRooms.filter((r) => r.active).length,
                  isActive: roomSourceFilter === "active",
                  onClick: () => setRoomSourceFilter("active"),
                },
              ]
            : undefined
        }
        secondaryActions={
          subTab === "general" ? (
            <div className="flex items-center gap-2 shrink-0">
              {isDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              <button
                type="button"
                onClick={() => loadSettingsFromStore(true)}
                className="h-[36px] inline-flex items-center justify-center gap-1.5 px-3.5 rounded-full text-xs font-semibold border border-border bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          ) : undefined
        }
        primaryAction={
          subTab === "rooms"
            ? {
                label: "Add Room",
                icon: <Plus className="w-4 h-4" />,
                onClick: handleOpenAddRoom,
              }
            : {
                label: "Save settings",
                icon: <Save className="w-3.5 h-3.5" />,
                onClick: () => persistConfig(config),
                className: isDirty ? "!bg-[#1456f0] hover:!bg-[#1146c7]" : "",
              }
        }
      />

      {/* --- SUB-TAB 1: KIOSK & TERMINALS (HORIZONTAL FULL-WIDTH SECTIONS) --- */}
      {subTab === "general" && (
        <div className="space-y-6">
          {/* Section 1: Clinic & persona (Horizontal) */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Clinic &amp; persona
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Clinic Name
                </label>
                <input
                  type="text"
                  value={config.clinicName || ""}
                  onChange={(e) => updateDraft((prev) => ({ ...prev, clinicName: e.target.value }))}
                  placeholder="e.g. Navodya Eye Clinic"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Support Phone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={config.supportPhone || ""}
                    onChange={(e) => updateDraft((prev) => ({ ...prev, supportPhone: e.target.value }))}
                    placeholder="+91-9876543210"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Support Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={config.supportEmail || ""}
                    onChange={(e) => updateDraft((prev) => ({ ...prev, supportEmail: e.target.value }))}
                    placeholder="desk@clinic.test"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Primary Color
                </label>
                <div className="flex items-center gap-3 px-3 py-1.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1456f0]/20 focus-within:border-[#1456f0]">
                  <label className="relative flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 overflow-hidden cursor-pointer shrink-0 shadow-2xs">
                    <span className="w-full h-full block" style={{ backgroundColor: accentColor }} />
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => updateDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      aria-label="Primary brand color picker"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                  <input
                    type="text"
                    value={config.primaryColor || "#2f2447"}
                    onChange={(e) => updateDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#2f2447"
                    className="flex-1 text-sm font-mono text-gray-800 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Greeting Phrase
              </label>
              <textarea
                rows={2}
                value={config.greetingPhrase || ""}
                onChange={(e) => updateDraft((prev) => ({ ...prev, greetingPhrase: e.target.value }))}
                placeholder="Welcome to our clinic. How can I help you today?"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all resize-y"
              />
            </div>
          </div>

          {/* Section 2: Kiosk features (Horizontal Grid) */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Kiosk features
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {KIOSK_FEATURE_LIST.map((item) => {
                const enabled = Boolean(features[item.key]);
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                      enabled
                        ? "border-blue-100 bg-blue-50/20 hover:border-blue-200"
                        : "border-gray-200/90 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={item.label}
                      onClick={() => handleToggleFeature(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        enabled ? "bg-[#1456f0]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                          enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Queue & Onboarding Rules (Horizontal 3-Column Section) */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Queue &amp; Onboarding Rules
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              <div className="p-4 bg-gray-50/80 border border-gray-200/90 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Late Arrival Window</label>
                    <span className="font-mono text-xs font-bold text-[#1456f0]">{config.lateArrivalWindowMin} min</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="45"
                    step="5"
                    value={config.lateArrivalWindowMin}
                    onChange={(e) =>
                      updateDraft((prev) => ({ ...prev, lateArrivalWindowMin: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer accent-[#1456f0]"
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Appointments arriving &gt; {config.lateArrivalWindowMin}m late are automatically downgraded to Priority 0.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 border border-gray-200/90 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Anti-Starvation Queue Aging Cap</label>
                    <span className="font-mono text-xs font-bold text-[#1456f0]">{config.queueAgingCapMin} min</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="5"
                    value={config.queueAgingCapMin}
                    onChange={(e) =>
                      updateDraft((prev) => ({ ...prev, queueAgingCapMin: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer accent-[#1456f0]"
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Walk-in tickets waiting &gt; {config.queueAgingCapMin}m receive an automatic priority boost.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 border border-gray-200/90 rounded-xl space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-800">Default Onboarding Process</label>
                  <select
                    value={config.defaultOnboardingProcessId || "Appointment Scheduling"}
                    onChange={(e) =>
                      updateDraft((prev) => ({ ...prev, defaultOnboardingProcessId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] outline-none cursor-pointer font-medium text-slate-800"
                  >
                    <option value="Appointment Scheduling">Appointment Scheduling (Default)</option>
                    <option value="Patient Intake">Patient Intake</option>
                    <option value="Follow-up Calls">Follow-up Calls</option>
                    <option value="Clinical Visit Journey">Clinical Visit Journey</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Walk-ins registered at kiosks enter this process automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Receptionist terminals (Horizontal) */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Receptionist terminals
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddTerminal}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add terminal
              </button>
            </div>

            {terminals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-8 text-center">
                <p className="text-xs font-medium text-gray-500">
                  No terminals configured yet. Click &quot;+ Add terminal&quot; to provision a kiosk station.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="p-4 rounded-2xl border border-gray-200/90 bg-gray-50/50 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row items-stretch md:items-end gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Terminal Name
                      </label>
                      <input
                        type="text"
                        value={terminal.name}
                        onChange={(e) => handleTerminalChange(terminal.id, "name", e.target.value)}
                        placeholder="e.g. Front Desk"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0]"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Location Label
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={terminal.locationLabel}
                          onChange={(e) => handleTerminalChange(terminal.id, "locationLabel", e.target.value)}
                          placeholder="e.g. Lobby"
                          className="w-full pl-8 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLaunchTerminal(terminal)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Launch
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTerminal(terminal.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: CLINIC ROOMS & DESKS (TABLE COMPONENT) --- */}
      {subTab === "rooms" && (
        <TableComponent<UnifiedRoomRow>
          data={filteredRooms}
          columns={roomColumns}
          getRowId={(row) => row.rowKey}
          rowActions={getRoomRowActions}
          enableSelection={false}
          enableColumnCustomization={true}
          defaultRowsPerPage={20}
          emptyMessage="No rooms match your filter. Click Add Room to configure an AI Receptionist room."
          onRowClick={handleOpenEditRoom}
          tableId="ai_receptionist_rooms_table"
        />
      )}

      {/* --- ADD / EDIT ROOM DRAWER --- */}
      <DrawerShell
        isOpen={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title={editingRoom ? "Edit Room" : "Add Room"}
        subtitle={
          editingRoom?.source === "services"
            ? `Products & Services room${editingRoom.serviceName ? ` · Attached to ${editingRoom.serviceName}` : ""}`
            : "AI Receptionist room · No product or service attached"
        }
        icon={<Building2 className="w-4 h-4" />}
        width="max-w-lg"
        zIndex={900}
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRoomModal(false)}
              className="px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reception-room-drawer-form"
              className="px-4 py-2 bg-[#1E293B] text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              {editingRoom ? "Save Changes" : "Create Room"}
            </button>
          </div>
        }
      >
        <form id="reception-room-drawer-form" onSubmit={handleSaveRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Room Label *</label>
            <input
              type="text"
              required
              value={roomFormData.name}
              onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
              placeholder="e.g. Waiting Lounge Reception Desk"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {(!editingRoom || editingRoom.source === "reception") && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
                <select
                  value={roomFormData.type}
                  onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value as StationType })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="doctor_room">Doctor Room</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="lab">Diagnostic Lab</option>
                  <option value="billing">Billing Desk</option>
                  <option value="desk">Front Desk</option>
                </select>
              </div>
            )}
            <div className={editingRoom?.source === "services" ? "col-span-2" : ""}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Room Number</label>
              <input
                type="text"
                value={roomFormData.roomNumber}
                onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                placeholder="e.g. 101, Counter A"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Direction</label>
            <textarea
              rows={3}
              value={roomFormData.direction}
              onChange={(e) => setRoomFormData({ ...roomFormData, direction: e.target.value })}
              placeholder="e.g. Walk past main desk and turn left down corridor B."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location / Floor Wing</label>
            <input
              type="text"
              value={roomFormData.location}
              onChange={(e) => setRoomFormData({ ...roomFormData, location: e.target.value })}
              placeholder="e.g. Ground Floor, Main Lobby"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Responsible</label>
            <input
              type="text"
              value={roomFormData.providerName}
              onChange={(e) => setRoomFormData({ ...roomFormData, providerName: e.target.value })}
              placeholder="e.g. Dr. Ananya Sharma"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-gray-200 bg-gray-50/70">
            <label htmlFor="stationActive" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Active
            </label>
            <input
              type="checkbox"
              id="stationActive"
              checked={roomFormData.active}
              onChange={(e) => setRoomFormData({ ...roomFormData, active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </form>
      </DrawerShell>
    </div>
  );
}
