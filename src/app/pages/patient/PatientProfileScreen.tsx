import React, { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Bell,
  Lock,
  Check,
  Sparkles,
  Camera,
  LogOut,
  Stethoscope,
  Heart,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { useOrganization } from "../../context/OrganizationContext";

interface PortalContext {
  activeClient: Client;
  onStageChange?: (newStageName: string) => void;
}

type ProfileTab = "personal" | "security" | "notifications";

export default function PatientProfileScreen() {
  const navigate = useNavigate();
  const { activeClient } = useOutletContext<PortalContext>();
  const { activeOrganization } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");

  // Form State initialized from activeClient
  const [formData, setFormData] = useState({
    name: activeClient?.name || "",
    email: activeClient?.email || "",
    phone: activeClient?.phone || "",
    gender: (activeClient as any)?.gender || "Not Specified",
    birthDate: (activeClient as any)?.birthDate || "1988-06-15",
    emergencyContactName: (activeClient as any)?.emergencyContactName || "Priya Johnson",
    emergencyContactPhone: (activeClient as any)?.emergencyContactPhone || "+1 (555) 987-6543",
    language: (activeClient as any)?.language || "English (US)",
    avatarUrl: (activeClient as any)?.avatarUrl || "",
  });

  // Keep in sync when activeClient switches
  useEffect(() => {
    if (activeClient) {
      setFormData({
        name: activeClient.name || "",
        email: activeClient.email || "",
        phone: activeClient.phone || "",
        gender: (activeClient as any).gender || "Not Specified",
        birthDate: (activeClient as any).birthDate || "1988-06-15",
        emergencyContactName: (activeClient as any).emergencyContactName || "Priya Johnson",
        emergencyContactPhone: (activeClient as any).emergencyContactPhone || "+1 (555) 987-6543",
        language: (activeClient as any).language || "English (US)",
        avatarUrl: (activeClient as any).avatarUrl || "",
      });
    }
  }, [activeClient]);

  // Security tab states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Notification states
  const [notifyApptSMS, setNotifyApptSMS] = useState(true);
  const [notifyApptWhatsApp, setNotifyApptWhatsApp] = useState(true);
  const [notifyApptEmail, setNotifyApptEmail] = useState(true);
  const [notifyBills, setNotifyBills] = useState(true);

  const initials = (formData.name || "Patient")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("") || "PT";

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setFormData((prev) => ({ ...prev, avatarUrl: result }));
        toast.success("Profile photo updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? {
            ...c,
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            gender: formData.gender,
            birthDate: formData.birthDate,
            emergencyContactName: formData.emergencyContactName,
            emergencyContactPhone: formData.emergencyContactPhone,
            language: formData.language,
            avatarUrl: formData.avatarUrl,
          }
        : c
    );
    saveStoredClients(updated);

    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: activeClient.id }));
    toast.success("Profile changes saved and synchronized with clinic records!");
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    if (!newPassword || newPassword.length < 4) {
      toast.error("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? {
            ...c,
            portalPassword: newPassword,
          }
        : c
    );
    saveStoredClients(updated);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully!");
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("patient_portal_active_client_id");
    localStorage.removeItem("patient_portal_active_client_id");
    toast.success("Signed out successfully");
    navigate("/patient/login");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* ── Page Header (Clean, Zero AI Slop) ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ── Layout Grid: Profile Card + Tabs & Details ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Avatar & Summary Card */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-xs">
            {/* Avatar Circle */}
            <div className="relative mb-3">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.name}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-100 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white border border-slate-200 shadow-xs hover:bg-slate-50 text-slate-600 cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900">{formData.name}</h3>
            <span className="text-xs font-mono text-slate-400 mt-0.5">#{activeClient?.id}</span>

            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active Patient</span>
            </div>

            {/* Quick Details List */}
            <div className="w-full mt-5 pt-4 border-t border-slate-100 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-500">
                <span>Facility:</span>
                <span className="font-bold text-slate-800 truncate max-w-[150px]">
                  {activeOrganization?.name || "Demo Mantra Care"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Physician:</span>
                <span className="font-bold text-slate-800 truncate max-w-[150px]">
                  {activeClient?.responsible || "Dr. Rajesh Patel"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Primary Journey:</span>
                <span className="font-bold text-blue-600 truncate max-w-[150px]">
                  {activeClient?.processes?.[0] || "Patient Care Journey"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Tabs & Form Content */}
        <div className="md:col-span-7 space-y-4">
          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "personal"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Personal Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "notifications"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Notifications
            </button>
          </div>

          {/* Tab 1: Personal Details */}
          {activeTab === "personal" && (
            <form
              onSubmit={handleSavePersonal}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-150"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mobile Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange("birthDate", e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Not Specified">Not Specified</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Emergency Companion / Attendant</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                      placeholder="Companion Name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                      placeholder="Phone Number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === "security" && (
            <form
              onSubmit={handleSaveSecurity}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-150"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
                <p className="text-xs text-slate-500">Set a custom password to sign in across web and mobile.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Notification Preferences */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Communication Channels</h3>
                <p className="text-xs text-slate-500">Choose how the clinic updates you on appointments and invoices.</p>
              </div>

              <div className="divide-y divide-slate-100 space-y-1">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">SMS Appointment Reminders</div>
                    <div className="text-[11px] text-slate-500">Receive text notifications 24 hours prior to visits</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptSMS}
                    onChange={(e) => {
                      setNotifyApptSMS(e.target.checked);
                      toast.success("Notification preferences saved");
                    }}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">WhatsApp Live Updates</div>
                    <div className="text-[11px] text-slate-500">Receive queue and check-in pass links via WhatsApp</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptWhatsApp}
                    onChange={(e) => {
                      setNotifyApptWhatsApp(e.target.checked);
                      toast.success("Notification preferences saved");
                    }}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Email Clinical Summaries</div>
                    <div className="text-[11px] text-slate-500">Receive post-visit consultation notes and receipts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptEmail}
                    onChange={(e) => {
                      setNotifyApptEmail(e.target.checked);
                      toast.success("Notification preferences saved");
                    }}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
