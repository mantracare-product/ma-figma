import React, { useState, useEffect } from "react";
import { X, Search, Users, Check, Share2, Plus } from "lucide-react";
import { Campaign } from "../../pages/Chats";
import { Button } from "../ui/Button";
import { getClientList, ClientItem } from "../../../lib/getClientList";

interface CampaignShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  initialSelectedIds?: string[];
  onShare: (payload: {
    channel: "whatsapp" | "sms";
    audienceName: string;
    clientIds: string[];
    manualRecipients: { name?: string; phone: string }[];
  }) => void;
}

export default function CampaignShareModal({
  isOpen,
  onClose,
  campaign,
  initialSelectedIds = [],
  onShare,
}: CampaignShareModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [audienceName, setAudienceName] = useState<string>("");
  
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [activeSubTab, setActiveSubTab] = useState<"clients" | "manual">("clients");
  const [manualNumbers, setManualNumbers] = useState<{ id: string; name?: string; phone: string }[]>([]);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    if (!isOpen || !campaign) return;
    setSelectedIds(initialSelectedIds);
    setAudienceName(campaign.audienceName || `${campaign.name} Audience`);
    setSearch("");
    setSelectedChannel("whatsapp");
    setActiveSubTab("clients");
    setManualNumbers(
      (campaign.audienceManualRecipients || []).map((m, i) => ({
        id: `manual-prefill-${i}`,
        name: m.name,
        phone: m.phone,
      }))
    );
    setManualPhone("");
    setManualName("");

    // Use shared utility — same data source as handleShareCampaign
    setAllClients(getClientList());
  }, [isOpen, campaign, initialSelectedIds]);

  if (!isOpen || !campaign) return null;

  // Only show clients that have a valid phone number
  const filteredClients = allClients.filter(c => {
    if (!c.phoneNumber || c.phoneNumber.trim() === "") return false;
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.id));
    }
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = manualPhone.trim();
    if (!phone) return;

    if (manualNumbers.some(m => m.phone === phone)) {
      return;
    }

    const newEntry = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: manualName.trim() || undefined,
      phone,
    };
    setManualNumbers(prev => [...prev, newEntry]);
    setManualPhone("");
    setManualName("");
  };

  const handleRemoveManual = (id: string) => {
    setManualNumbers(prev => prev.filter(x => x.id !== id));
  };

  const handleConfirm = () => {
    if (!audienceName.trim() || totalCount === 0) return;
    onShare({
      channel: selectedChannel,
      audienceName: audienceName.trim(),
      clientIds: selectedIds,
      manualRecipients: manualNumbers.map(m => ({ name: m.name, phone: m.phone })),
    });
    onClose();
  };

  const totalCount = selectedIds.length + manualNumbers.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200" onClick={onClose} />

      {/* Side Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ width: "480px" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Share Campaign
              </h3>
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Target campaign: <strong className="text-gray-800">{campaign.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Configuration Controls (Channel selector, Audience Name, and Sub-tabs) */}
        <div className="space-y-4 flex-shrink-0 px-6 pt-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Select Channel
            </label>
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl w-full">
              {(["whatsapp", "sms"] as const).map(ch => {
                const isActive = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSelectedChannel(ch)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-purple-700 shadow-xs border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audience Name Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Audience Name
            </label>
            <input
              type="text"
              value={audienceName}
              onChange={e => setAudienceName(e.target.value)}
              placeholder="e.g. Recent Patients, VIP Clients, Follow-up List"
              className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            {!audienceName.trim() && (
              <p className="text-[11px] text-amber-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                Give this audience a name so it's easy to identify later
              </p>
            )}
          </div>
        </div>

        {/* Sub-tabs selector */}
        <div className="flex border-b border-gray-100 px-6 mt-4 flex-shrink-0">
          {(["clients", "manual"] as const).map(tab => {
            const isActive = activeSubTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSubTab(tab)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-purple-600 text-purple-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {tab === "clients" ? "From Clients" : "Add Number Manually"}
              </button>
            );
          })}
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeSubTab === "clients" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients by name or phone..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="font-semibold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
                >
                  {selectedIds.length === filteredClients.length && filteredClients.length > 0
                    ? "Deselect all"
                    : "Select all shown"}
                </button>
                <span className="font-medium">
                  <strong className="text-gray-800">{selectedIds.length}</strong> selected
                </span>
              </div>

              <div className="space-y-1.5">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs space-y-1">
                    <Users className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
                    <p>No clients found matching "{search}"</p>
                  </div>
                ) : (
                  filteredClients.map(client => {
                    const isSelected = selectedIds.includes(client.id);
                    return (
                      <div
                        key={client.id}
                        onClick={() => toggleSelect(client.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-50/60 border-purple-200 shadow-2xs"
                            : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-purple-600 border-purple-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {client.name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {client.phoneNumber} {client.email ? `· ${client.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSubTab === "manual" && (
            <div className="space-y-5">
              {/* Form */}
              <form onSubmit={handleAddManual} className="bg-gray-50/80 p-4 border border-gray-100 rounded-2xl space-y-3.5">
                <h4 className="text-xs font-bold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Add Recipient Manually
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={manualPhone}
                      onChange={e => setManualPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Plus className="w-4 h-4" /> Add Recipient
                </button>
              </form>

              {/* Running List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Manual Recipients
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">
                    <strong className="text-gray-800">{manualNumbers.length}</strong> added
                  </span>
                </div>
                {manualNumbers.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400">
                    No manual recipients added yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {manualNumbers.map(recipient => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 bg-purple-50/40 border border-purple-100 rounded-xl"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            {recipient.name || "Raw Number"}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">{recipient.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveManual(recipient.id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={totalCount === 0 || !audienceName.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
          >
            Share Campaign ({totalCount})
          </button>
        </div>
      </div>
    </>
  );
}
