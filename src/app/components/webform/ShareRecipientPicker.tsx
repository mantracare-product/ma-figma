// ShareRecipientPicker.tsx
import React, { useState, useRef, useEffect } from "react";
import { Search, X, Filter, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { ShareClient, ShareLiteralRecipient, ShareChannel } from "./shareTypes";

interface MockClient extends ShareClient {
  status: "Active" | "Lead" | "Inactive";
  tag: "VIP" | "Follow-up" | "General";
}

const MOCK_CLIENTS: MockClient[] = [
  { id: "c1", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "+1 (555) 123-4567", status: "Active", tag: "VIP" },
  { id: "c2", name: "Michael Chen", email: "mchen@email.com", phone: "+1 (555) 987-6543", status: "Lead", tag: "Follow-up" },
  { id: "c3", name: "Emily Davis", email: "emily.d@email.com", phone: "+1 (555) 432-1098", status: "Active", tag: "VIP" },
  { id: "c4", name: "Robert Wilson", email: "rwilson@email.com", phone: "+1 (555) 456-7890", status: "Inactive", tag: "General" },
  { id: "c5", name: "Jessica Brown", email: "jbrown@email.com", phone: "+1 (555) 765-4321", status: "Lead", tag: "Follow-up" },
  { id: "c6", name: "David Martinez", email: "d.martinez@email.com", phone: "+1 (555) 345-6789", status: "Active", tag: "General" },
  { id: "c7", name: "Lisa Anderson", email: "l.anderson@email.com", phone: "+1 (555) 789-0123", status: "Active", tag: "VIP" },
  { id: "c8", name: "James Taylor", email: "jtaylor@email.com", phone: "+1 (555) 678-9012", status: "Lead", tag: "Follow-up" },
];

const SEGMENT_FILTERS = [
  { id: "all", label: "All Clients" },
  { id: "status-active", label: "Status: Active" },
  { id: "status-lead", label: "Status: Lead" },
  { id: "tag-vip", label: "Tag: VIP" },
  { id: "tag-followup", label: "Tag: Follow-up" },
];

interface ShareRecipientPickerProps {
  channel: ShareChannel;
  selectedClients: ShareClient[];
  onClientsChange: (clients: ShareClient[]) => void;
  selectedLiterals: ShareLiteralRecipient[];
  onLiteralsChange: (literals: ShareLiteralRecipient[]) => void;
}

export default function ShareRecipientPicker({
  channel,
  selectedClients,
  onClientsChange,
  selectedLiterals,
  onLiteralsChange,
}: ShareRecipientPickerProps) {
  // Client Search & Segment Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeSegment, setActiveSegment] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Literal Input State
  const [literalInput, setLiteralInput] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients by search query & segment
  const filteredClients = MOCK_CLIENTS.filter((c) => {
    const matchesSearch = !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeSegment === "status-active") return c.status === "Active";
    if (activeSegment === "status-lead") return c.status === "Lead";
    if (activeSegment === "tag-vip") return c.tag === "VIP";
    if (activeSegment === "tag-followup") return c.tag === "Follow-up";

    return true;
  });

  const handleToggleClient = (client: ShareClient) => {
    const isSelected = selectedClients.some((c) => c.id === client.id);
    if (isSelected) {
      onClientsChange(selectedClients.filter((c) => c.id !== client.id));
    } else {
      onClientsChange([...selectedClients, client]);
    }
  };

  const handleRemoveClient = (clientId: string) => {
    onClientsChange(selectedClients.filter((c) => c.id !== clientId));
  };

  // Literal Input Handlers
  const validateLiteral = (val: string): boolean => {
    if (channel === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val);
    } else {
      const digitsOnly = val.replace(/\D/g, "");
      return digitsOnly.length >= 7;
    }
  };

  const handleAddLiteral = () => {
    const trimmed = literalInput.trim();
    if (!trimmed) return;

    if (!validateLiteral(trimmed)) {
      const label = channel === "email" ? "valid email address" : "valid phone number";
      toast.error(`Please enter a ${label}`);
      return;
    }

    const isDuplicate = selectedLiterals.some(r => r.value.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      toast.error("This recipient has already been added");
      return;
    }

    const newLiteral: ShareLiteralRecipient = {
      id: `lit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      value: trimmed,
    };

    onLiteralsChange([...selectedLiterals, newLiteral]);
    setLiteralInput("");
  };

  const handleRemoveLiteral = (id: string) => {
    onLiteralsChange(selectedLiterals.filter(r => r.id !== id));
  };

  const totalCount = selectedClients.length + selectedLiterals.length;
  const literalLabel = channel === "email" ? "Email Address" : "Phone Number";
  const literalPlaceholder =
    channel === "email"
      ? "Or enter email address manually..."
      : "Or enter phone number manually...";

  return (
    <div ref={containerRef} className="space-y-3 text-left relative">
      {/* a. Client Search Input + Segment Filter Dropdown */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Select Clients
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Search clients by name, email, or phone..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
            />
          </div>

          {/* Segment Filter Popover */}
          <div ref={filterRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              title="Filter by segment"
              className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${
                activeSegment !== "all"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-border text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 z-40 mt-1.5 w-48 bg-white border border-border rounded-lg shadow-xl py-1.5 text-xs">
                <div className="px-3 py-1.5 font-semibold text-gray-400 uppercase tracking-wider text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Filter Segment
                </div>
                {SEGMENT_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveSegment(f.id);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      activeSegment === f.id ? "font-bold text-blue-700 bg-blue-50/50" : "text-gray-700"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>{f.label}</span>
                    {activeSegment === f.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Client Search Dropdown */}
        {isFocused && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto left-0">
            {filteredClients.length === 0 ? (
              <div
                className="px-4 py-3 text-sm text-gray-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                No matching clients found
              </div>
            ) : (
              filteredClients.map((client) => {
                const isChecked = selectedClients.some((c) => c.id === client.id);
                return (
                  <div
                    key={client.id}
                    onClick={() => handleToggleClient(client)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold"
                          style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                        >
                          {client.name}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {client.tag}
                        </span>
                      </div>
                      <p
                        className="text-xs text-gray-500 truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {client.email} · {client.phone}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* b. Literal Entry Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Add {literalLabel} Directly
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={literalInput}
            onChange={(e) => setLiteralInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLiteral();
              }
            }}
            placeholder={literalPlaceholder}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
          />
          <button
            type="button"
            onClick={handleAddLiteral}
            className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* c. Unified Chips Row showing everyone selected (Clients + Literals) */}
      {totalCount > 0 && (
        <div className="relative">
          <div
            className="flex flex-nowrap gap-1.5 mt-2 overflow-x-auto pb-1 max-w-full"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#CBD5E1 transparent",
            }}
          >
            {/* Client chips */}
            {selectedClients.map((client) => (
              <span
                key={`client-${client.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shrink-0"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {client.name}
                <button
                  type="button"
                  onClick={() => handleRemoveClient(client.id)}
                  className="hover:text-blue-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Literal chips */}
            {selectedLiterals.map((lit) => (
              <span
                key={`literal-${lit.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shrink-0"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {lit.value}
                <button
                  type="button"
                  onClick={() => handleRemoveLiteral(lit.id)}
                  className="hover:text-blue-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div
            className="absolute right-0 top-2 bottom-1 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, white)" }}
          />
        </div>
      )}

      {/* d. Helper text */}
      <p
        className="text-xs"
        style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
      >
        {totalCount === 0
          ? "No recipients selected yet"
          : `${totalCount} recipient(s) selected`}
      </p>
    </div>
  );
}