// ShareRecipientPicker.tsx
// TODO: replace with real contacts source once available
import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { ShareClient } from "./shareTypes";

const MOCK_CLIENTS: ShareClient[] = [
  { id: "c1", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "+1 (555) 123-4567" },
  { id: "c2", name: "Michael Chen", email: "mchen@email.com", phone: "+1 (555) 987-6543" },
  { id: "c3", name: "Emily Davis", email: "emily.d@email.com", phone: "+1 (555) 432-1098" },
  { id: "c4", name: "Robert Wilson", email: "rwilson@email.com", phone: "+1 (555) 456-7890" },
  { id: "c5", name: "Jessica Brown", email: "jbrown@email.com", phone: "+1 (555) 765-4321" },
  { id: "c6", name: "David Martinez", email: "d.martinez@email.com", phone: "+1 (555) 345-6789" },
  { id: "c7", name: "Lisa Anderson", email: "l.anderson@email.com", phone: "+1 (555) 789-0123" },
  { id: "c8", name: "James Taylor", email: "jtaylor@email.com", phone: "+1 (555) 678-9012" },
];

interface ShareRecipientPickerProps {
  selected: ShareClient[];
  onChange: (clients: ShareClient[]) => void;
}

export default function ShareRecipientPicker({
  selected,
  onChange,
}: ShareRecipientPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = searchQuery.trim()
    ? MOCK_CLIENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    )
    : MOCK_CLIENTS;

  // Dropdown opens whenever the component is focused (not only when there's search text)
  const showDropdown = isFocused;

  const handleToggleClient = (client: ShareClient) => {
    const isSelected = selected.some((c) => c.id === client.id);
    if (isSelected) {
      onChange(selected.filter((c) => c.id !== client.id));
    } else {
      onChange([...selected, client]);
    }
  };

  const handleRemoveClient = (clientId: string) => {
    onChange(selected.filter((c) => c.id !== clientId));
  };

  return (
    <div
      ref={containerRef}
      className="space-y-2 text-left relative"
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search clients by name, email, or phone..."
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
        />

        {showDropdown && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div
                className="px-4 py-3 text-sm text-gray-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                No matching clients found
              </div>
            ) : (
              filteredClients.map((client) => {
                const isChecked = selected.some((c) => c.id === client.id);
                return (
                  <div
                    key={client.id}
                    onClick={() => handleToggleClient(client)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                      >
                        {client.name}
                      </p>
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

      {selected.length > 0 && (
        <div className="relative">
          {/* Single-row horizontally scrollable chips — never wrap */}
          <div
            className="flex flex-nowrap gap-1.5 mt-2 overflow-x-auto pb-1 max-w-full"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#CBD5E1 transparent",
            }}
          >
            {selected.map((client) => (
              <span
                key={client.id}
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
          </div>
          {/* Right-edge fade affordance — signals the row is scrollable */}
          <div
            className="absolute right-0 top-2 bottom-1 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, white)" }}
          />
        </div>
      )}

      <p
        className="text-xs"
        style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
      >
        {selected.length === 0
          ? "No recipients selected yet"
          : `${selected.length} recipient(s) selected`}
      </p>
    </div>
  );
}