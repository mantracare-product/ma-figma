import React, { useState } from "react";
import { User, Phone, Mail, Users, Edit3, X, Check } from "lucide-react";
import { toast } from "sonner";

interface PatientProfileProps {
  clientId: string;
  onSelectClient?: (id: string) => void;
}

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

const DEFAULT_PROFILE: ProfileData = {
  name: "Ramesh Iyer",
  phone: "+91 98765 43210",
  email: "ramesh.iyer@email.com",
  emergencyContactName: "Priya Iyer",
  emergencyContactRelation: "Daughter",
  emergencyContactPhone: "+91 98765 11223",
};

export default function PatientProfile({ clientId }: PatientProfileProps) {
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const saved = localStorage.getItem("patient_profile_ramesh");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");

  const handleStartEdit = (field: string, currentVal: string) => {
    setEditingField(field);
    setTempValue(currentVal);
  };

  const handleSaveEdit = () => {
    if (!editingField) return;

    let updated = { ...profile };
    if (editingField === "name") updated.name = tempValue;
    if (editingField === "phone") updated.phone = tempValue;
    if (editingField === "email") updated.email = tempValue;
    if (editingField === "emergency") {
      // Expect format "Name · Relation · Phone" or update contact
      updated.emergencyContactPhone = tempValue;
    }

    setProfile(updated);
    localStorage.setItem("patient_profile_ramesh", JSON.stringify(updated));
    setEditingField(null);
    toast.success("Profile updated successfully");
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header — Rule 0 & §5: Header "Profile", no subtext */}
      <div>
        <h1 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-white">
          Profile
        </h1>
      </div>

      {/* Plain fields, nothing else (§5) */}
      <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        {/* Name */}
        <div
          onClick={() => handleStartEdit("name", profile.name)}
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Name</div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {profile.name}
              </div>
            </div>
          </div>
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Phone */}
        <div
          onClick={() => handleStartEdit("phone", profile.phone)}
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Phone</div>
              <div className="font-medium text-slate-900 dark:text-white font-mono">
                {profile.phone}
              </div>
            </div>
          </div>
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Email */}
        <div
          onClick={() => handleStartEdit("email", profile.email)}
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Email</div>
              <div className="font-medium text-slate-900 dark:text-white font-mono">
                {profile.email}
              </div>
            </div>
          </div>
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Emergency Contact */}
        <div
          onClick={() => handleStartEdit("emergency", profile.emergencyContactPhone)}
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Emergency Contact</div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {profile.emergencyContactName} ({profile.emergencyContactRelation}) &nbsp;·&nbsp;{" "}
                <span className="font-mono font-normal text-slate-600 dark:text-slate-300">
                  {profile.emergencyContactPhone}
                </span>
              </div>
            </div>
          </div>
          <Edit3 className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Edit Modal (Flow 13) */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setEditingField(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white capitalize">
                Edit {editingField === "emergency" ? "Emergency Contact Phone" : editingField}
              </h3>
            </div>

            <div className="space-y-3">
              <input
                type={editingField === "email" ? "email" : "text"}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
