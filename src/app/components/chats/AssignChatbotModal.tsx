import React, { useState, useEffect } from "react";
import { Bot } from "./ChatbotTab";
import { X, Bot as BotIcon, AlertTriangle, Check, UserCheck } from "lucide-react";
import { Button } from "../ui/Button";

interface AssignChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: "whatsapp" | "sms" | "website";
  assignedPersonId?: string;
  assignedBotId?: string;
  onAssign: (bot: Bot) => void;
}

export default function AssignChatbotModal({
  isOpen,
  onClose,
  channel,
  assignedPersonId,
  assignedBotId,
  onAssign,
}: AssignChatbotModalProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showTakeoverConfirm, setShowTakeoverConfirm] = useState(false);
  const [humanName, setHumanName] = useState<string>("a team member");

  useEffect(() => {
    if (!isOpen) {
      setSelectedBot(null);
      setShowTakeoverConfirm(false);
      return;
    }

    // Load bots from localStorage
    try {
      const raw = localStorage.getItem("chatbotBots");
      if (raw) {
        const sanitizeBot = (b: Bot): Bot => ({
          ...b,
          channels: (b.channels || []).filter((c) => c !== "sms"),
        });
        const all = (JSON.parse(raw) as Bot[]).map(sanitizeBot);
        const filtered = all.filter(
          (b) => b.active && Array.isArray(b.channels) && b.channels.includes(channel)
        );
        setBots(filtered);
      } else {
        setBots([]);
      }
    } catch {
      setBots([]);
    }

    if (assignedPersonId) {
      try {
        const rawEmp = localStorage.getItem("teamMembers");
        if (rawEmp) {
          const emp = JSON.parse(rawEmp).find((e: any) => e.id === assignedPersonId);
          if (emp?.name) setHumanName(emp.name);
        }
      } catch {}
    }
  }, [isOpen, channel, assignedPersonId]);

  if (!isOpen) return null;

  const handleSelectBot = (bot: Bot) => {
    setSelectedBot(bot);
    if (assignedPersonId) {
      setShowTakeoverConfirm(true);
    } else {
      onAssign(bot);
      onClose();
    }
  };

  const handleConfirmTakeover = () => {
    if (selectedBot) {
      onAssign(selectedBot);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <BotIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Assign Chatbot</h3>
              <p className="text-xs text-muted-foreground">Select a bot for {channel} channel</p>
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {showTakeoverConfirm && selectedBot ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2.5 text-amber-600 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>Confirm Unassigning Staff</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This conversation is currently assigned to <strong className="text-foreground">{humanName}</strong>. Assigning <strong>{selectedBot.name}</strong> will unassign {humanName} and return bot control to active status.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTakeoverConfirm(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmTakeover}
                  className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Assign Bot & Unassign Staff
                </Button>
              </div>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <BotIcon className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">No active chatbots available</p>
              <p className="text-xs">Create or activate a chatbot enabled for {channel} channel in the Chatbots tab.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bots.map((bot) => {
                const isCurrent = bot.id === assignedBotId;
                return (
                  <button
                    key={bot.id}
                    onClick={() => handleSelectBot(bot)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                      isCurrent
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{bot.name}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {bot.description || bot.greetingMessage || "No description provided"}
                      </p>
                    </div>
                    {isCurrent ? (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <BotIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
