import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Camera,
  Upload,
} from "lucide-react";
import {
  getCompanionWidgetConfig,
  saveCompanionWidgetConfig,
  CompanionWidgetConfig,
  CompanionRequirementItem,
} from "../../../lib/companionWidgetStore";
import { getStoredProcesses } from "../../../lib/useProcessStore";
import { toast } from "sonner";
import { InfoTooltip } from "../help/InfoTooltip";

interface CompanionSettingsTabProps {
  onNavigateToInbox?: () => void;
  registerSaveHandler?: (fn: () => void) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  isDrawer?: boolean;
}

export default function CompanionSettingsTab({
  registerSaveHandler,
  isDrawer = false,
}: CompanionSettingsTabProps) {
  const [config, setConfig] = useState<CompanionWidgetConfig>(getCompanionWidgetConfig);
  const [processes] = useState(() => getStoredProcesses());
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveCompanionWidgetConfig(config);
    toast.success("Companion Care Bot settings saved successfully!");
  };

  useEffect(() => {
    if (registerSaveHandler) {
      registerSaveHandler(handleSave);
    }
  }, [registerSaveHandler, config]);

  const updateConfig = (patch: Partial<CompanionWidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const compressImage = (file: File, maxDim = 256, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
          } else {
            resolve((e.target?.result as string) || "");
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || "");
        img.src = (e.target?.result as string) || "";
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image file must be under 20MB");
        return;
      }
      try {
        const compressed = await compressImage(file, 256, 0.85);
        if (!compressed) {
          toast.error("Could not process image");
          return;
        }
        const newCfg = { ...config, avatarUrl: compressed };
        setConfig(newCfg);
        saveCompanionWidgetConfig(newCfg);
        toast.success("Bot profile photo updated!");
      } catch (err) {
        console.error("Avatar upload error:", err);
        toast.error("Failed to update profile photo");
      }
    }
  };

  const handleRemoveAvatar = () => {
    const newCfg = { ...config, avatarUrl: "" };
    setConfig(newCfg);
    saveCompanionWidgetConfig(newCfg);
    toast.success("Profile photo removed");
  };

  // Requirement management matching WebsiteWidgetSettingsTab
  const handleAddRequirement = () => {
    const newReq: CompanionRequirementItem = {
      id: `req-${Date.now()}`,
      label: "New Patient Requirement",
      processId: processes[0]?.id || "1",
    };
    updateConfig({
      requirements: [...config.requirements, newReq],
    });
  };

  const handleUpdateRequirement = (index: number, field: "label" | "processId", value: string) => {
    const updated = [...config.requirements];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ requirements: updated });
  };

  const handleRemoveRequirement = (index: number) => {
    if (config.requirements.length <= 1) return;
    const updated = config.requirements.filter((_, i) => i !== index);
    updateConfig({ requirements: updated });
  };

  const renderForms = () => (
    <div className="space-y-4">
      {/* Welcome Greeting */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-2">
        <label className="text-xs font-bold text-slate-700 block" style={{ fontFamily: "Outfit, sans-serif" }}>
          Welcome Greeting
        </label>
        <textarea
          rows={3}
          value={config.welcomeMessage}
          onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
          placeholder="Hi there! How can we help you today?"
          className="w-full text-xs font-medium text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
        />
      </div>

      {/* Requirement to Process Mapping */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              Requirement to Process Mapping
            </h3>
            <InfoTooltip text="Map each client requirement choice to its target process for automatic workflow routing and intake" />
          </div>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100/70 px-2 py-1 rounded-lg transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-2">
          {(config.requirements || []).map((req, idx) => (
            <div key={req.id || idx} className="flex items-center gap-2">
              <input
                type="text"
                value={req.label}
                onChange={(e) => handleUpdateRequirement(idx, "label", e.target.value)}
                placeholder="Requirement label"
                className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <span className="text-xs text-slate-400 font-mono">→</span>
              <select
                value={req.processId}
                onChange={(e) => handleUpdateRequirement(idx, "processId", e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {config.requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  title="Remove requirement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bot Identity & Profile Photo */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4.5 space-y-3.5">
        <div>
          <label className="text-xs font-bold text-slate-800 block" style={{ fontFamily: "Outfit, sans-serif" }}>
            Bot Identity & Profile Photo
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure the avatar image and name displayed to patients in Care Bot.
          </p>
        </div>

        {/* Profile Picture Uploader */}
        <div className="flex items-center gap-3.5 pt-1">
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => avatarInputRef.current?.click()}
            className="w-14 h-14 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 hover:border-blue-500 flex items-center justify-center text-blue-600 shrink-0 cursor-pointer transition-all overflow-hidden group shadow-2xs relative"
            title="Click to upload profile photo"
          >
            {config.avatarUrl ? (
              <img
                src={config.avatarUrl}
                alt={config.botName || "Care Bot"}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Bot className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            )}

            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold rounded-xl">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Photo</span>
              </button>

              {config.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Recommended: JPG, PNG, or SVG (under 5MB).
            </p>
          </div>
        </div>

        {/* Bot Name Input */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-700 block" style={{ fontFamily: "Outfit, sans-serif" }}>
            Bot Name
          </label>
          <div className="relative">
            <Bot className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={config.botName}
              onChange={(e) => updateConfig({ botName: e.target.value })}
              placeholder="Care Bot"
              className="w-full text-xs font-semibold pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // If in a drawer, render the settings form directly
  if (isDrawer) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            Chatbot Configuration
          </span>
          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
            {config.requirements.length} requirements mapped
          </span>
        </div>

        {renderForms()}
      </div>
    );
  }

  // Full page view (non-drawer fallback)
  return (
    <div className="max-w-3xl space-y-6 pb-12 animate-in fade-in duration-200">
      {renderForms()}
    </div>
  );
}
