/**
 * AdminTelephony.tsx
 * Path: src/app/pages/admin/AdminTelephony.tsx
 *
 * Dedicated Unified Admin Console for Telephony (Integrations > Telephony):
 * - URL synced tabs: Providers | Numbers (?tab=providers / ?tab=numbers)
 * - Providers tab:
 *   - Cards showing ONLY: (a) Provider name + avatar, (b) Numbers in use,
 *     (c) LiveKit & Dograh SIP trunk credentials (with masked secret, reveal, copy, audit logging),
 *     (d) Subscription due date (warning if <=7d or overdue)
 *   - Configure drawer to edit credentials, due date, name (calls configureTelephonyProvider with audit log)
 *   - "Add Provider" in top bar (G1)
 * - Numbers tab:
 *   - TableComponent with search, filters (provider, organization, country), pagination
 *   - Columns: Number (E.164), Country, Provider, ORG ID (G3), Organization, Target Countries (pills with +N overflow)
 *   - Row actions: Assign/reassign org, edit target countries, release number
 *   - "Add Number" in top bar (G1), Export CSV icon in top bar (G2)
 */

import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { Modal } from "../../components/ui/Modal";
import { Tooltip } from "../../components/ui/Tooltip";

import {
  useAdminTelephonyProviders,
  useAdminPhoneNumbers,
  TelephonyProviderItem,
  PhoneNumberItem,
  TelephonyProviderName,
  PhoneNumberType,
  configureTelephonyProvider,
  addTelephonyProvider,
  assignPhoneNumber,
  unassignPhoneNumber,
  releasePhoneNumber,
  addPhoneNumber,
  updateNumberTargetCountries,
  recordRevealSecretAudit,
} from "../../../lib/telephonyAdminStore";
import { useOrganization } from "../../context/OrganizationContext";
import { exportToCsv } from "../../../lib/productAnalyticsStore";
import {
  Radio,
  Phone,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Calendar,
  Layers,
  Search,
  ChevronDown,
  Globe,
  Building2,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

const ALL_TARGET_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "IN",
  "AU",
  "DE",
  "FR",
  "SG",
  "AE",
  "NZ",
  "IE",
];

export default function AdminTelephony() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: "providers" | "numbers" = rawTab === "numbers" ? "numbers" : "providers";

  const setTab = (t: "providers" | "numbers") => {
    setSearchParams({ tab: t });
  };

  const { providers, refresh: refreshProviders } = useAdminTelephonyProviders();
  const { phoneNumbers, refresh: refreshNumbers } = useAdminPhoneNumbers();
  const { organizations } = useOrganization();

  // ─────────────────────────────────────────────────────────────
  // PROVIDERS TAB STATE & HANDLERS
  // ─────────────────────────────────────────────────────────────
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Configure Provider Drawer
  const [configuringProvider, setConfiguringProvider] = useState<TelephonyProviderItem | null>(null);
  const [editProviderName, setEditProviderName] = useState<TelephonyProviderName>("Twilio");
  const [editLkUser, setEditLkUser] = useState("");
  const [editLkSecret, setEditLkSecret] = useState("");
  const [editDgrUser, setEditDgrUser] = useState("");
  const [editDgrSecret, setEditDgrSecret] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // Add Provider Drawer
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [newProvName, setNewProvName] = useState<TelephonyProviderName>("Twilio");
  const [newLkUser, setNewLkUser] = useState("");
  const [newLkSecret, setNewLkSecret] = useState("");
  const [newDgrUser, setNewDgrUser] = useState("");
  const [newDgrSecret, setNewDgrSecret] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const handleToggleSecret = (prov: TelephonyProviderItem, aiProvider: "LiveKit" | "Dograh") => {
    const key = `${prov.id}-${aiProvider}`;
    const willReveal = !revealedSecrets[key];
    setRevealedSecrets((prev) => ({ ...prev, [key]: willReveal }));
    if (willReveal) {
      recordRevealSecretAudit(prov.name, aiProvider);
      toast.info(`Secret revealed for ${prov.name} (${aiProvider}) · Logged to Audit Chronicle`);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenConfigure = (prov: TelephonyProviderItem) => {
    setConfiguringProvider(prov);
    setEditProviderName(prov.name);
    setEditLkUser(prov.livekitCredentials?.username || "");
    setEditLkSecret(prov.livekitCredentials?.secret || "");
    setEditDgrUser(prov.dograhCredentials?.username || "");
    setEditDgrSecret(prov.dograhCredentials?.secret || "");
    setEditDueDate(prov.subscriptionDueDate || "2026-12-01");
  };

  const handleSaveConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringProvider) return;

    configureTelephonyProvider(configuringProvider.id, {
      name: editProviderName,
      livekitCredentials: { username: editLkUser, secret: editLkSecret },
      dograhCredentials: { username: editDgrUser, secret: editDgrSecret },
      subscriptionDueDate: editDueDate,
    });
    refreshProviders();
    setConfiguringProvider(null);
    toast.success(`Configuration saved for ${editProviderName}`);
  };

  const handleSaveNewProvider = (e: React.FormEvent) => {
    e.preventDefault();
    addTelephonyProvider({
      name: newProvName,
      livekitCredentials: { username: newLkUser, secret: newLkSecret },
      dograhCredentials: { username: newDgrUser, secret: newDgrSecret },
      subscriptionDueDate: newDueDate || "2026-12-01",
    });
    refreshProviders();
    setIsAddProviderOpen(false);
    toast.success(`Added ${newProvName} carrier integration`);
  };

  // Due Date calculation helper
  const getDueDateStatus = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue by ${Math.abs(diffDays)}d (${new Date(dueDateStr).toLocaleDateString()})`,
        isOverdue: true,
        isWarning: true,
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Due in ${diffDays}d (${new Date(dueDateStr).toLocaleDateString()})`,
        isOverdue: false,
        isWarning: true,
      };
    }
    return {
      label: `Due ${new Date(dueDateStr).toLocaleDateString()}`,
      isOverdue: false,
      isWarning: false,
    };
  };

  const [providerSearch, setProviderSearch] = useState("");

  const filteredProviders = useMemo(() => {
    if (!providerSearch.trim()) return providers;
    const q = providerSearch.toLowerCase();
    return providers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [providers, providerSearch]);

  // ─────────────────────────────────────────────────────────────
  // NUMBERS TAB STATE & HANDLERS
  // ─────────────────────────────────────────────────────────────
  const [numbersSearchQuery, setNumbersSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  // Assign Modal State
  const [numberToAssign, setNumberToAssign] = useState<PhoneNumberItem | null>(null);
  const [targetOrgId, setTargetOrgId] = useState("");

  // Edit Target Countries Modal
  const [numberForTargetCountries, setNumberForTargetCountries] = useState<PhoneNumberItem | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Add Number Drawer
  const [isAddNumberOpen, setIsAddNumberOpen] = useState(false);
  const [newNumNumber, setNewNumNumber] = useState("");
  const [newNumProvider, setNewNumProvider] = useState<TelephonyProviderName>("Twilio");
  const [newNumCountry, setNewNumCountry] = useState("US");
  const [newNumType, setNewNumType] = useState<PhoneNumberType>("Local");
  const [newNumTargets, setNewNumTargets] = useState<string[]>(["US", "CA"]);

  // Unique country list from phone numbers
  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    phoneNumbers.forEach((p) => {
      if (p.country) set.add(p.country);
    });
    return Array.from(set);
  }, [phoneNumbers]);

  const filteredPhoneNumbers = useMemo(() => {
    return phoneNumbers.filter((item) => {
      if (item.status === "Released") return false;

      if (providerFilter !== "all" && item.provider !== providerFilter) return false;
      if (countryFilter !== "all" && item.country !== countryFilter) return false;
      if (orgFilter !== "all") {
        if (orgFilter === "unassigned" && item.status !== "Unassigned") return false;
        if (orgFilter !== "unassigned" && item.assignedOrgId !== orgFilter) return false;
      }

      if (numbersSearchQuery.trim()) {
        const q = numbersSearchQuery.toLowerCase();
        const matchNum = item.number.toLowerCase().includes(q) || item.rawNumber.includes(q);
        const matchOrg = item.assignedOrgName?.toLowerCase().includes(q) || false;
        const matchCode = item.assignedOrgCode?.toLowerCase().includes(q) || false;
        if (!matchNum && !matchOrg && !matchCode) return false;
      }

      return true;
    });
  }, [phoneNumbers, providerFilter, countryFilter, orgFilter, numbersSearchQuery]);

  const handleConfirmAssignment = () => {
    if (!numberToAssign || !targetOrgId) {
      toast.error("Please select an organization");
      return;
    }

    const org = organizations.find((o) => o.id === targetOrgId);
    if (!org) return;

    assignPhoneNumber(
      numberToAssign.id,
      org.id,
      org.name,
      org.orgCode || "ORG-0001",
      "General AI Voice Line"
    );
    refreshNumbers();
    setNumberToAssign(null);
    toast.success(`Assigned ${numberToAssign.number} to ${org.name}`);
  };

  const handleConfirmTargetCountries = () => {
    if (!numberForTargetCountries) return;
    updateNumberTargetCountries(numberForTargetCountries.id, selectedCountries);
    refreshNumbers();
    setNumberForTargetCountries(null);
    toast.success(`Updated target countries for ${numberForTargetCountries.number}`);
  };

  const handleReleaseNumber = (item: PhoneNumberItem) => {
    if (confirm(`Release ${item.number} back to carrier (${item.provider})? This will detach it from all workflows.`)) {
      releasePhoneNumber(item.id, "Administrative release from numbers inventory");
      refreshNumbers();
      toast.success(`Released ${item.number}`);
    }
  };

  const handleSaveNewNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumNumber.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }

    addPhoneNumber({
      number: newNumNumber.trim(),
      rawNumber: newNumNumber.replace(/\D/g, ""),
      provider: newNumProvider,
      country: newNumCountry,
      type: newNumType,
      status: "Unassigned",
      capabilities: ["voice", "sms"],
      targetCountries: newNumTargets,
      monthlyCost: 15.0,
    });
    refreshNumbers();
    setIsAddNumberOpen(false);
    setNewNumNumber("");
    toast.success(`Added ${newNumNumber} to inventory`);
  };

  const handleExportNumbersCsv = () => {
    const headers = [
      "Phone Number",
      "Country",
      "Provider",
      "ORG ID",
      "Organization",
      "Target Countries",
      "Status",
    ];
    const rows = filteredPhoneNumbers.map((p) => [
      `"${p.number}"`,
      p.country,
      p.provider,
      p.assignedOrgCode || "—",
      `"${(p.assignedOrgName || "—").replace(/"/g, '""')}"`,
      `"${(p.targetCountries || [p.country]).join(", ")}"`,
      p.status,
    ]);
    exportToCsv("mantra-telephony-numbers", headers, rows);
    toast.success(`Exported ${filteredPhoneNumbers.length} numbers to CSV`);
  };

  // Numbers Table Columns
  const numberColumns: TableColumn<PhoneNumberItem>[] = [
    {
      key: "number",
      header: "NUMBER",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900 text-xs tabular-nums whitespace-nowrap">
          {row.number}
        </span>
      ),
    },
    {
      key: "country",
      header: "COUNTRY",
      width: "80px",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 uppercase">
          {row.country}
        </span>
      ),
    },
    {
      key: "provider",
      header: "PROVIDER",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
          {row.provider}
        </span>
      ),
    },
    {
      key: "orgCode",
      header: "ORG ID",
      width: "110px",
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
          {row.assignedOrgCode || "—"}
        </span>
      ),
    },
    {
      key: "orgName",
      header: "ORGANIZATION",
      render: (row) => (
        <span
          className="text-xs font-medium text-gray-900 truncate max-w-[170px] block"
          title={row.assignedOrgName || "Unassigned"}
        >
          {row.assignedOrgName || "—"}
        </span>
      ),
    },
    {
      key: "targetCountries",
      header: "TARGET COUNTRIES",
      render: (row) => {
        const countries = row.targetCountries || [row.country];
        const visible = countries.slice(0, 2);
        const overflow = countries.length - visible.length;

        return (
          <div className="flex items-center gap-1">
            {visible.map((c) => (
              <span
                key={c}
                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-mono text-[10px] font-bold"
              >
                {c}
              </span>
            ))}
            {overflow > 0 && (
              <Tooltip text={`Target countries: ${countries.join(", ")}`}>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] font-bold cursor-help">
                  +{overflow}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const numberRowActions: TableRowAction<PhoneNumberItem>[] = [
    {
      label: "Assign Organization",
      icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => {
        setNumberToAssign(item);
        setTargetOrgId(item.assignedOrgId || organizations[0]?.id || "");
      },
    },
    {
      label: "Edit Target Countries",
      icon: <Globe className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (item) => {
        setNumberForTargetCountries(item);
        setSelectedCountries(item.targetCountries || [item.country]);
      },
    },
    {
      label: "Release Number",
      icon: <X className="w-3.5 h-3.5 text-rose-600" />,
      onClick: (item) => handleReleaseNumber(item),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── Top Bar Header ── */}
      <PageHeader
        title="Telephony"
        subtitle="Carrier connectivity, AI media trunks, and cross-organization phone number assignments"
      />

      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-6 animate-in fade-in duration-200">
        {/* Unified PageTopBar with Tab Switcher Dropdown, Search, Filters, Export & Add Action */}
        <PageTopBar
          searchQuery={activeTab === "providers" ? providerSearch : numbersSearchQuery}
          onSearchChange={activeTab === "providers" ? setProviderSearch : setNumbersSearchQuery}
          searchPlaceholder={
            activeTab === "providers"
              ? "Search telephony carriers by name..."
              : "Search phone number, organization, or ORG ID..."
          }
          onExport={activeTab === "numbers" ? handleExportNumbersCsv : undefined}
          primaryAction={
            activeTab === "providers"
              ? {
                  label: "Add Provider",
                  onClick: () => setIsAddProviderOpen(true),
                }
              : {
                  label: "Add Number",
                  onClick: () => setIsAddNumberOpen(true),
                }
          }
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              {/* Tab Switcher Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={activeTab}
                  onChange={(e) => setTab(e.target.value as "providers" | "numbers")}
                  className="h-[34px] px-3 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none cursor-pointer appearance-none shadow-2xs transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="providers">Providers</option>
                  <option value="numbers">Numbers</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Numbers filters only on numbers tab with compact widths */}
              {activeTab === "numbers" && (
                <>
                  {/* Provider filter */}
                  <div className="relative">
                    <select
                      value={providerFilter}
                      onChange={(e) => setProviderFilter(e.target.value)}
                      className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                    >
                      <option value="all">All Providers</option>
                      <option value="Twilio">Twilio</option>
                      <option value="Exotel">Exotel</option>
                      <option value="Plivo">Plivo</option>
                      <option value="Telnyx">Telnyx</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Organization filter */}
                  <div className="relative">
                    <select
                      value={orgFilter}
                      onChange={(e) => setOrgFilter(e.target.value)}
                      className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[140px] transition-colors truncate"
                    >
                      <option value="all">All Organizations</option>
                      <option value="unassigned">Unassigned Only</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Country filter */}
                  <div className="relative">
                    <select
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
                    >
                      <option value="all">All Countries</option>
                      {uniqueCountries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              )}
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: PROVIDERS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "providers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredProviders.map((prov) => {
                const lkKey = `${prov.id}-LiveKit`;
                const dgrKey = `${prov.id}-Dograh`;
                const isLkRevealed = !!revealedSecrets[lkKey];
                const isDgrRevealed = !!revealedSecrets[dgrKey];

                const lkSecret = prov.livekitCredentials?.secret || "••••••••••••••••";
                const dgrSecret = prov.dograhCredentials?.secret || "••••••••••••••••";

                const dueInfo = getDueDateStatus(prov.subscriptionDueDate);

                return (
                  <div
                    key={prov.id}
                    className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-4">
                      {/* 1. Header: Name with Initials Avatar & Numbers in Use */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {prov.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3
                              className="text-base font-bold text-slate-900 leading-tight"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {prov.name}
                            </h3>
                            <div className="text-xs text-slate-500 font-medium">
                              {prov.numbersCount} {prov.numbersCount === 1 ? "number" : "numbers"} in use
                            </div>
                          </div>
                        </div>

                        {/* Subscription Due Date Tag */}
                        {dueInfo && (
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              dueInfo.isOverdue
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : dueInfo.isWarning
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{dueInfo.label}</span>
                          </div>
                        )}
                      </div>

                      {/* 2. SIP Trunk Credentials: LiveKit & Dograh Blocks */}
                      <div className="space-y-3 pt-1">
                        {/* LiveKit Block */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            <span>LiveKit SIP Trunk</span>
                            <span className="text-[10px] font-semibold text-slate-400 lowercase">voice engine</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex items-center justify-between min-w-0">
                              <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Username</span>
                                <span className="font-mono text-slate-800 truncate block text-[11px]">
                                  {prov.livekitCredentials?.username || `sip_livekit_${prov.name.toLowerCase()}_trunk`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(prov.livekitCredentials?.username || `sip_livekit_${prov.name.toLowerCase()}_trunk`, `${prov.name} LiveKit User`)}
                                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                                title="Copy Username"
                              >
                                {copiedKey === `${prov.name} LiveKit User` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex items-center justify-between min-w-0">
                              <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Secret</span>
                                <span className="font-mono text-slate-800 truncate block text-[11px]">
                                  {isLkRevealed ? lkSecret : "••••••••••••••••"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSecret(prov, "LiveKit")}
                                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                  title={isLkRevealed ? "Hide Secret" : "Reveal Secret"}
                                >
                                  {isLkRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {isLkRevealed && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(lkSecret, `${prov.name} LiveKit Secret`)}
                                    className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                    title="Copy Secret"
                                  >
                                    {copiedKey === `${prov.name} LiveKit Secret` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dograh Block */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            <span>Dograh SIP Trunk</span>
                            <span className="text-[10px] font-semibold text-slate-400 lowercase">media gateway</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex items-center justify-between min-w-0">
                              <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Username</span>
                                <span className="font-mono text-slate-800 truncate block text-[11px]">
                                  {prov.dograhCredentials?.username || `sip_dograh_${prov.name.toLowerCase()}_gw`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(prov.dograhCredentials?.username || `sip_dograh_${prov.name.toLowerCase()}_gw`, `${prov.name} Dograh User`)}
                                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                                title="Copy Username"
                              >
                                {copiedKey === `${prov.name} Dograh User` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 flex items-center justify-between min-w-0">
                              <div className="min-w-0 pr-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Secret</span>
                                <span className="font-mono text-slate-800 truncate block text-[11px]">
                                  {isDgrRevealed ? dgrSecret : "••••••••••••••••"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSecret(prov, "Dograh")}
                                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                  title={isDgrRevealed ? "Hide Secret" : "Reveal Secret"}
                                >
                                  {isDgrRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {isDgrRevealed && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(dgrSecret, `${prov.name} Dograh Secret`)}
                                    className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                    title="Copy Secret"
                                  >
                                    {copiedKey === `${prov.name} Dograh Secret` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: NUMBERS
        ───────────────────────────────────────────────────────────── */}
        {activeTab === "numbers" && (
          <div className="space-y-4">
            {/* Standard Data Table */}
            <div className="w-full">
              <TableComponent<PhoneNumberItem>
                data={filteredPhoneNumbers}
                columns={numberColumns}
                rowActions={numberRowActions}
                getRowId={(item) => item.id}
                defaultRowsPerPage={20}
                pageSizeOptions={[20, 50, 100]}
                emptyMessage="No phone numbers found matching the specified filters."
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONFIGURE PROVIDER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <DrawerShell
        isOpen={!!configuringProvider}
        onClose={() => setConfiguringProvider(null)}
        title={configuringProvider ? `Configure ${configuringProvider.name}` : "Configure Provider"}
        subtitle="Manage LiveKit & Dograh SIP trunk credentials and carrier subscription billing cycle"
        width="w-full sm:w-[500px]"
      >
        {configuringProvider && (
          <form onSubmit={handleSaveConfigure} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Provider Name
              </label>
              <select
                value={editProviderName}
                onChange={(e) => setEditProviderName(e.target.value as TelephonyProviderName)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="Twilio">Twilio</option>
                <option value="Exotel">Exotel</option>
                <option value="Plivo">Plivo</option>
                <option value="Telnyx">Telnyx</option>
              </select>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                LiveKit SIP Trunk Credentials
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  SIP Username
                </label>
                <input
                  type="text"
                  value={editLkUser}
                  onChange={(e) => setEditLkUser(e.target.value)}
                  placeholder="e.g. sip_livekit_trunk"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  SIP Secret
                </label>
                <input
                  type="text"
                  value={editLkSecret}
                  onChange={(e) => setEditLkSecret(e.target.value)}
                  placeholder="e.g. lk_sec_..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Dograh SIP Trunk Credentials
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  SIP Username
                </label>
                <input
                  type="text"
                  value={editDgrUser}
                  onChange={(e) => setEditDgrUser(e.target.value)}
                  placeholder="e.g. sip_dograh_core"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  SIP Secret
                </label>
                <input
                  type="text"
                  value={editDgrSecret}
                  onChange={(e) => setEditDgrSecret(e.target.value)}
                  placeholder="e.g. dgr_sec_..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Subscription Due Date
              </label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A warning badge is rendered if renewal is due within 7 days or overdue.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfiguringProvider(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-black rounded-xl text-xs font-semibold text-white cursor-pointer shadow-xs"
              >
                Save Configuration
              </button>
            </div>
          </form>
        )}
      </DrawerShell>

      {/* ─────────────────────────────────────────────────────────────
          ADD PROVIDER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <DrawerShell
        isOpen={isAddProviderOpen}
        onClose={() => setIsAddProviderOpen(false)}
        title="Add Telephony Provider"
        subtitle="Connect a new carrier SIP trunk integration with LiveKit and Dograh configurations"
        width="w-full sm:w-[500px]"
      >
        <form onSubmit={handleSaveNewProvider} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Carrier Provider
            </label>
            <select
              value={newProvName}
              onChange={(e) => setNewProvName(e.target.value as TelephonyProviderName)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="Twilio">Twilio</option>
              <option value="Exotel">Exotel</option>
              <option value="Plivo">Plivo</option>
              <option value="Telnyx">Telnyx</option>
            </select>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              LiveKit SIP Credentials
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                SIP Username
              </label>
              <input
                type="text"
                required
                value={newLkUser}
                onChange={(e) => setNewLkUser(e.target.value)}
                placeholder="e.g. sip_livekit_username"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                SIP Secret
              </label>
              <input
                type="text"
                required
                value={newLkSecret}
                onChange={(e) => setNewLkSecret(e.target.value)}
                placeholder="e.g. lk_sec_..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dograh SIP Credentials
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                SIP Username
              </label>
              <input
                type="text"
                required
                value={newDgrUser}
                onChange={(e) => setNewDgrUser(e.target.value)}
                placeholder="e.g. sip_dograh_username"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                SIP Secret
              </label>
              <input
                type="text"
                required
                value={newDgrSecret}
                onChange={(e) => setNewDgrSecret(e.target.value)}
                placeholder="e.g. dgr_sec_..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Subscription Due Date
            </label>
            <input
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddProviderOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-black rounded-xl text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              Add Provider
            </button>
          </div>
        </form>
      </DrawerShell>

      {/* ─────────────────────────────────────────────────────────────
          ASSIGN ORGANIZATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!numberToAssign}
        onClose={() => setNumberToAssign(null)}
        title="Assign Organization"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Assign <span className="font-mono font-bold text-slate-900">{numberToAssign?.number}</span> ({numberToAssign?.provider}) to a tenant workspace.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Target Organization
            </label>
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.orgCode || "ORG"})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNumberToAssign(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAssignment}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          EDIT TARGET COUNTRIES MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!numberForTargetCountries}
        onClose={() => setNumberForTargetCountries(null)}
        title="Edit Target Countries"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select the destination countries allowed for outbound and inbound routing on{" "}
            <span className="font-mono font-bold text-slate-900">{numberForTargetCountries?.number}</span>.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
            {ALL_TARGET_COUNTRIES.map((c) => {
              const isSelected = selectedCountries.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCountries((prev) =>
                      isSelected ? prev.filter((item) => item !== c) : [...prev, c]
                    );
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 border-blue-300 text-blue-800"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono">{c}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNumberForTargetCountries(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmTargetCountries}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Save Countries
            </button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          ADD NUMBER DRAWER
      ───────────────────────────────────────────────────────────── */}
      <DrawerShell
        isOpen={isAddNumberOpen}
        onClose={() => setIsAddNumberOpen(false)}
        title="Add Phone Number"
        subtitle="Provision or register a new telephone number into the platform inventory pool"
        width="w-full sm:w-[500px]"
      >
        <form onSubmit={handleSaveNewNumber} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Phone Number (E.164)
            </label>
            <input
              type="text"
              required
              value={newNumNumber}
              onChange={(e) => setNewNumNumber(e.target.value)}
              placeholder="e.g. +1 (415) 555-0199"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Carrier Provider
              </label>
              <select
                value={newNumProvider}
                onChange={(e) => setNewNumProvider(e.target.value as TelephonyProviderName)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="Twilio">Twilio</option>
                <option value="Exotel">Exotel</option>
                <option value="Plivo">Plivo</option>
                <option value="Telnyx">Telnyx</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Country
              </label>
              <select
                value={newNumCountry}
                onChange={(e) => setNewNumCountry(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="US">US</option>
                <option value="GB">GB</option>
                <option value="IN">IN</option>
                <option value="CA">CA</option>
                <option value="AU">AU</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Number Type
            </label>
            <select
              value={newNumType}
              onChange={(e) => setNewNumType(e.target.value as PhoneNumberType)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="Local">Local</option>
              <option value="Toll-free">Toll-free</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Target Countries
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_TARGET_COUNTRIES.map((c) => {
                const isSelected = newNumTargets.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setNewNumTargets((prev) =>
                        isSelected ? prev.filter((it) => it !== c) : [...prev, c]
                      );
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 text-blue-800"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddNumberOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-black rounded-xl text-xs font-semibold text-white cursor-pointer shadow-xs"
            >
              Add Number
            </button>
          </div>
        </form>
      </DrawerShell>
    </div>
  );
}
