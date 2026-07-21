import React, { useState, useEffect } from "react";
import { Campaign } from "../../pages/Chats";
import { X, Zap, Check } from "lucide-react";
import { Button } from "../ui/Button";

interface EnrollCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (campaign: Campaign) => void;
}

export default function EnrollCampaignModal({
  isOpen,
  onClose,
  onEnroll,
}: EnrollCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const raw = localStorage.getItem("whatsappCampaigns");
      if (raw) {
        const all = JSON.parse(raw) as Campaign[];
        const active = all.filter((c) => c.status === "active");
        setCampaigns(active);
      } else {
        setCampaigns([]);
      }
    } catch {
      setCampaigns([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Enroll in Campaign</h3>
              <p className="text-xs text-muted-foreground">Select an active automated campaign</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <Zap className="w-8 h-8 mx-auto opacity-50 text-purple-500" />
              <p className="text-sm font-medium">No active campaigns</p>
              <p className="text-xs">Create or activate a campaign in the Campaigns tab.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => {
                    onEnroll(camp);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
                >
                  <div className="space-y-1">
                    <span className="font-medium text-sm text-foreground group-hover:text-purple-600 transition-colors">
                      {camp.name}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Audience: {camp.audience || "All contacts"} · {camp.nodes?.length || 0} steps
                    </p>
                  </div>
                  <Zap className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
