import React, { useState } from "react";
import {
  Server, Plus, Trash2, Eye, EyeOff, Play, ChevronLeft,
  PhoneIncoming, PhoneOutgoing
} from "lucide-react";
import { toast } from "sonner";

// ─── Data Model ───────────────────────────────────────────────────────────────

export interface SipTrunk {
  id: string;
  provider: string;
  label: string;
  countryCode: string;
  phoneNumber: string;
  priority: number;
  callDirection: "inbound" | "outbound";
  active: boolean;
  usernameOrApiKey?: string;
  passwordOrApiSecret?: string;
}

const SEED_TRUNKS: SipTrunk[] = [
  { id: "1", provider: "Twilio",  label: "Twilio-US",       countryCode: "US", phoneNumber: "13323333850",  priority: 1, callDirection: "outbound", active: true },
  { id: "2", provider: "Plivo",   label: "MC-B2C-Plivo",    countryCode: "IN", phoneNumber: "918035375213", priority: 1, callDirection: "inbound",  active: true },
  { id: "3", provider: "Zadarma", label: "Swe-Zad-341038",  countryCode: "SE", phoneNumber: "46766920242",  priority: 1, callDirection: "outbound", active: true },
  { id: "4", provider: "Zadarma", label: "UK-Zad357159",    countryCode: "GB", phoneNumber: "447458038154", priority: 1, callDirection: "inbound",  active: true },
  { id: "5", provider: "Zadarma", label: "Sing-Zad-230180", countryCode: "SG", phoneNumber: "6531251652",   priority: 1, callDirection: "inbound",  active: true },
  { id: "6", provider: "Zadarma", label: "SA-Zad-25139",    countryCode: "ZA", phoneNumber: "27600858573",  priority: 1, callDirection: "inbound",  active: true },
  { id: "7", provider: "Zadarma", label: "Kate-Zad-SIP",    countryCode: "US", phoneNumber: "14842918903",  priority: 1, callDirection: "outbound", active: true },
];

// ─── Country flag emoji map ────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", IN: "🇮🇳", SE: "🇸🇪", GB: "🇬🇧", SG: "🇸🇬",
  ZA: "🇿🇦", AU: "🇦🇺", CA: "🇨🇦", DE: "🇩🇪", FR: "🇫🇷",
  JP: "🇯🇵", BR: "🇧🇷", MX: "🇲🇽", AE: "🇦🇪", SA: "🇸🇦",
  NZ: "🇳🇿", NG: "🇳🇬", KE: "🇰🇪", PK: "🇵🇰", PH: "🇵🇭",
};

const getFlag = (code: string) => COUNTRY_FLAGS[code.toUpperCase()] ?? "🌐";

// ─── Providers ────────────────────────────────────────────────────────────────

const PROVIDERS = ["Twilio", "Zadarma", "Plivo"];

const TUTORIAL_URLS: Record<string, string> = {
  Twilio: "",
  Zadarma: "",
  Plivo: "",
};

// ─── Direction Badge ─────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: "inbound" | "outbound" }) {
  const isInbound = direction === "inbound";
  return (
    <span
      title={isInbound ? "Inbound" : "Outbound"}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium ${
        isInbound
          ? "bg-green-50 text-green-600"
          : "bg-blue-50 text-blue-600"
      }`}
    >
      {isInbound
        ? <PhoneIncoming className="w-3 h-3" />
        : <PhoneOutgoing className="w-3 h-3" />
      }
      {isInbound ? "Inbound" : "Outbound"}
    </span>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? "bg-[#2563EB]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── SIP Trunk Card ───────────────────────────────────────────────────────────

function TrunkCard({
  trunk,
  onToggle,
  onDelete,
}: {
  trunk: SipTrunk;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-blue-200 transition-colors flex flex-col gap-2">
      {/* Top row: name + toggle */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827] truncate">{trunk.provider}</p>
          <p className="text-xs text-[#9CA3AF] font-mono truncate">{trunk.label}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <Toggle checked={trunk.active} onChange={(v) => onToggle(trunk.id, v)} />
          <span
            className={`text-[10px] font-semibold tracking-wide ${
              trunk.active ? "text-[#2563EB]" : "text-[#9CA3AF]"
            }`}
          >
            {trunk.active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      {/* Country + number + direction badge */}
      <div className="mt-1">
        <span className="inline-flex items-center gap-1.5 text-xs text-[#374151]">
          {getFlag(trunk.countryCode)}
          <span className="font-medium">{trunk.countryCode}</span>
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-sm text-[#111827] font-medium font-mono">{trunk.phoneNumber}</p>
        </div>
        <div className="mt-1.5">
          <DirectionBadge direction={trunk.callDirection} />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => {
          if (window.confirm(`Remove "${trunk.label}"?`)) {
            onDelete(trunk.id);
          }
        }}
        className="absolute bottom-3 right-3 p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        title="Delete trunk"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddSipTrunkView({ onBack, onCreated }: { onBack: () => void; onCreated: (trunk: SipTrunk) => void }) {
  const [selectedProvider, setSelectedProvider] = useState("Twilio");
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState(1);
  const [callDirection, setCallDirection] = useState<"inbound" | "outbound" | null>(null);
  const [countryCode, setCountryCode] = useState("US");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleCreate = () => {
    if (!callDirection) { toast.error("Call Direction is required"); return; }
    if (!label.trim()) { toast.error("Label is required"); return; }
    if (!phoneNumber.trim()) { toast.error("Phone number is required"); return; }

    const trunk: SipTrunk = {
      id: String(Date.now()),
      provider: selectedProvider,
      label: label.trim(),
      countryCode: countryCode.toUpperCase(),
      phoneNumber: phoneNumber.trim(),
      priority,
      callDirection,
      active: true,
      usernameOrApiKey: username.trim() || undefined,
      passwordOrApiSecret: password.trim() || undefined,
    };
    onCreated(trunk);
    toast.success("SIP trunk added successfully");
  };

  const inputCls = "w-full px-4 py-2 bg-gray-50 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors";
  const labelCls = "block text-sm font-medium text-[#374151] mb-1.5";
  const tutorialUrl = TUTORIAL_URLS[selectedProvider] ?? "";

  return (
    <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: "2rem" }}>

      {/* ── Column 1: Provider sidebar ── */}
      <div>
        <p className="text-xs font-semibold text-[#9CA3AF] tracking-wide mb-3 uppercase">
          Phone Number Options
        </p>
        <div className="flex flex-col gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedProvider(p)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                selectedProvider === p
                  ? "bg-[#111827] text-white font-medium"
                  : "text-[#374151] hover:bg-[#F3F4F6]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column 2: Form ── */}
      <div className="space-y-4">
        {/* Call Direction (first field) */}
        <div>
          <label className={labelCls}>Call Direction</label>
          <div className="flex border border-[#E5E7EB] rounded-xl overflow-hidden w-fit">
            {(["inbound", "outbound"] as const).map((dir, i) => (
              <button
                key={dir}
                type="button"
                onClick={() => setCallDirection(dir)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  i < 1 ? "border-r border-[#E5E7EB]" : ""
                } ${
                  callDirection === dir
                    ? "bg-[#1A73E8] text-white"
                    : "bg-white text-[#374151] hover:bg-gray-50"
                }`}
              >
                {dir.charAt(0).toUpperCase() + dir.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label className={labelCls}>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Primary US Number"
            className={inputCls}
          />
        </div>

        {/* Priority */}
        <div>
          <label className={labelCls}>Priority</label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            min={1}
            className={inputCls}
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className={labelCls}>Phone Number</label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-24 px-2 py-2 bg-gray-50 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:border-blue-400"
            >
              {Object.entries(COUNTRY_FLAGS).map(([code, flag]) => (
                <option key={code} value={code}>{flag} {code}</option>
              ))}
            </select>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={inputCls}
            />
          </div>
        </div>

        {/* Username / API Key */}
        <div>
          <label className={labelCls}>Username / API Key</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username or API Key"
            className={inputCls}
          />
        </div>

        {/* Password / API Secret */}
        <div>
          <label className={labelCls}>Password / API Secret</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password or API Secret"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#374151] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Create
          </button>
        </div>
      </div>

      {/* ── Column 3: Tutorial ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full border-2 border-[#374151] flex items-center justify-center flex-shrink-0">
            <Play className="w-3 h-3 text-[#374151] fill-[#374151]" />
          </div>
          <span className="text-sm font-semibold text-[#111827]" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Tutorial Video
          </span>
        </div>
        <p className="text-xs text-[#6B7280] mt-1 leading-relaxed mb-4">
          Learn how to properly configure your telephony integration and sip trunking settings.
        </p>
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
          {tutorialUrl ? (
            <iframe
              src={tutorialUrl}
              className="w-full rounded-lg aspect-video"
              allowFullScreen
              title={`${selectedProvider} Tutorial`}
            />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
                <Play className="w-5 h-5 text-[#9CA3AF] fill-[#9CA3AF]" />
              </div>
              <p className="text-xs text-[#9CA3AF] leading-snug max-w-[200px]">
                No tutorial video available for this provider yet
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TelephonyIntegrationPanel() {
  const [mode, setMode] = useState<"list" | "add">("list");
  const [trunks, setTrunks] = useState<SipTrunk[]>(SEED_TRUNKS);
  const [directionFilter, setDirectionFilter] = useState<"all" | "inbound" | "outbound">("all");

  const filteredTrunks = trunks.filter((t) => {
    if (directionFilter === "all") return true;
    return t.callDirection === directionFilter;
  });

  const handleToggle = (id: string, active: boolean) => {
    setTrunks((prev) => prev.map((t) => (t.id === id ? { ...t, active } : t)));
    toast.success(active ? "SIP trunk activated" : "SIP trunk deactivated");
  };

  const handleDelete = (id: string) => {
    setTrunks((prev) => prev.filter((t) => t.id !== id));
    toast.success("SIP trunk removed");
  };

  const handleCreated = (trunk: SipTrunk) => {
    setTrunks((prev) => [...prev, trunk]);
    setMode("list");
  };

  return (
    <div className="space-y-6">
      {/* ── Main white card ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {mode === "add" && (
              <button
                onClick={() => setMode("list")}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[#374151]"
                title="Back to list"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h2
                className="text-lg font-bold text-[#111827] leading-tight"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Telephony Provider
              </h2>
              <p className="text-sm text-[#6B7280]">
                Configure your SIP trunks and voice provider credentials
              </p>
            </div>
          </div>

          {mode === "list" && (
            <button
              onClick={() => setMode("add")}
              className="inline-flex items-center gap-1.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-full px-4 py-2 text-sm font-medium transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add SIP Trunk
            </button>
          )}
        </div>

        {/* ── List View ── */}
        {mode === "list" && (
          <>
            {/* Direction filter segmented control with live counts */}
            {(() => {
              const inboundCount  = trunks.filter(t => t.callDirection === "inbound").length;
              const outboundCount = trunks.filter(t => t.callDirection === "outbound").length;
              const labels: Record<"all" | "inbound" | "outbound", string> = {
                all:      `All (${trunks.length})`,
                inbound:  `Inbound (${inboundCount})`,
                outbound: `Outbound (${outboundCount})`,
              };
              return (
                <div className="mt-5 flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden w-fit">
                  {(["all", "inbound", "outbound"] as const).map((dir, i) => (
                    <button
                      key={dir}
                      onClick={() => setDirectionFilter(dir)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        i > 0 ? "border-l border-[#E5E7EB]" : ""
                      } ${
                        directionFilter === dir
                          ? "bg-[#111827] text-white"
                          : "bg-white text-[#6B7280] hover:text-[#111827]"
                      }`}
                    >
                      {labels[dir]}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Trunk grid */}
            {filteredTrunks.length === 0 ? (
              <div className="mt-6 border-2 border-dashed border-[#E5E7EB] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
                {directionFilter === "inbound" && (
                  <PhoneIncoming className="w-9 h-9 text-green-300" />
                )}
                {directionFilter === "outbound" && (
                  <PhoneOutgoing className="w-9 h-9 text-blue-300" />
                )}
                {directionFilter === "all" && (
                  <Server className="w-9 h-9 text-[#D1D5DB]" />
                )}
                <p className="text-sm font-medium text-[#6B7280]">
                  {directionFilter === "all"
                    ? "No SIP trunks configured yet"
                    : `No ${directionFilter} numbers yet`}
                </p>
                <button
                  onClick={() => setMode("add")}
                  className="inline-flex items-center gap-1.5 bg-[#111827] text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-[#1f2937] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add SIP Trunk
                </button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTrunks.map((trunk) => (
                  <TrunkCard
                    key={trunk.id}
                    trunk={trunk}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Add View ── */}
        {mode === "add" && (
          <AddSipTrunkView onBack={() => setMode("list")} onCreated={handleCreated} />
        )}
      </div>
    </div>
  );
}

