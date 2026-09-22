import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  MapPin,
  Clock,
  Camera,
  LogOut,
  Shield,
  Bell,
  Lock,
  Bookmark,
  Check,
  ChevronDown,
  Sparkles,
  KeyRound,
  Smartphone,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface PatientProfileProps {
  clientId?: string;
  onSelectClient?: (id: string) => void;
}

type ProfileTab = "personal" | "security" | "notifications";

interface ProfileFormData {
  name: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  gender: string;
  birthDate: string;
  language: string;
  country: string;
  timezone: string;
  avatarUrl?: string;
}

const DEFAULT_PROFILE: ProfileFormData = {
  name: "abhishek testehr",
  email: "abhishek.madaan+testehr@mantra.care",
  phoneCountryCode: "+91",
  phoneNumber: "7788994455",
  gender: "",
  birthDate: "",
  language: "English (English)",
  country: "India",
  timezone: "Asia/Kolkata",
};

export default function PatientProfile({ clientId, onSelectClient }: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved profile data with screenshot default
  const [savedData, setSavedData] = useState<ProfileFormData>(() => {
    try {
      const stored = localStorage.getItem("patient_profile_v2");
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_PROFILE;
  });

  const [formData, setFormData] = useState<ProfileFormData>(savedData);

  // Security tab states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notifications tab states
  const [notifyApptEmail, setNotifyApptEmail] = useState(true);
  const [notifyApptSMS, setNotifyApptSMS] = useState(true);
  const [notifyApptWhatsApp, setNotifyApptWhatsApp] = useState(true);
  const [notifyReportsEmail, setNotifyReportsEmail] = useState(true);

  // Compute initials (e.g. "AT" for "abhishek testehr")
  const initials = (formData.name || "Abhishek Testehr")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join("") || "AT";

  // Handle Input Changes
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Avatar Upload Handler
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

  // Save changes
  const handleSaveChanges = () => {
    setSavedData(formData);
    localStorage.setItem("patient_profile_v2", JSON.stringify(formData));
    toast.success("Profile changes saved successfully!");
  };

  // Discard changes
  const handleDiscard = () => {
    setFormData(savedData);
    toast.info("Unsaved changes discarded");
  };

  // Sign out simulation
  const handleSignOut = () => {
    toast.info("Signing out of patient companion session...");
    setTimeout(() => {
      window.location.href = "/patient-front/today";
    }, 600);
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* =========================================================================
          PAGE HEADER: Title, Subtitle, and Sign Out Button
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal information and preferences
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200/90 dark:border-red-900/60 bg-white dark:bg-[#151c24] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold shadow-2xs transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN LAYOUT (Stacked on Mobile)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN: Avatar Card + Account Info Card
            ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Avatar Card */}
          <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center shadow-xs">
            {/* Avatar Circle with Online Dot */}
            <div className="relative">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.name}
                  className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-slate-100 dark:ring-slate-800"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl tracking-wider shadow-sm"
                  style={{ backgroundColor: "#0c2340" }}
                >
                  {initials}
                </div>
              )}
              {/* Cyan / Sky-blue status dot */}
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#151c24]"
                style={{ backgroundColor: "#00a3ff" }}
                title="Active patient session"
              />
            </div>

            {/* Patient Name */}
            <div className="mt-3.5 mb-4 text-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize">
                {formData.name || "abhishek testehr"}
              </h3>
            </div>

            {/* Dark Navy Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
              style={{ backgroundColor: "#0c2a55" }}
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Upload</span>
            </button>
          </div>

          {/* Card 2: Account Info Card */}
          <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Account Info
            </div>

            {/* Row 1: Email */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Email
                </div>
                <div
                  className="text-xs font-medium text-slate-900 dark:text-white truncate"
                  title={formData.email}
                >
                  {formData.email}
                </div>
              </div>
            </div>

            {/* Row 2: Country */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Country
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  {formData.country || "India"}
                </div>
              </div>
            </div>

            {/* Row 3: Timezone */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Timezone
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  {formData.timezone || "Asia/Kolkata"}
                </div>
              </div>
            </div>

            {/* Row 4: Language */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Language
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  {formData.language.split(" ")[0] || "English"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Tabs + Body (Personal Info / Security / Notifications)
            ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tabs Bar Header (Personal Info, Security, Notifications) */}
          <div className="flex border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#151c24] rounded-2xl p-1.5 shadow-2xs">
            {/* Tab 1: Personal Info */}
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "personal"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#1456f0] shadow-xs ring-1 ring-[#1456f0]/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Personal Info</span>
            </button>

            {/* Tab 2: Security */}
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "security"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#1456f0] shadow-xs ring-1 ring-[#1456f0]/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </button>

            {/* Tab 3: Notifications */}
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "notifications"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#1456f0] shadow-xs ring-1 ring-[#1456f0]/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
          </div>

          {/* =====================================================================
              TAB 1 CONTENT: PERSONAL INFO
              ===================================================================== */}
          {activeTab === "personal" && (
            <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
                  Profile Information
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your account details and preferences
                </p>
              </div>

              {/* SECTION: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Personal Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 1: NAME * */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="abhishek testehr"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      />
                    </div>
                  </div>

                  {/* Field 2: EMAIL (Locked) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed select-all"
                      />
                      <Lock
                        className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2"
                        title="Email cannot be changed directly"
                      />
                    </div>
                  </div>

                  {/* Field 3: PHONE NUMBER */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-1 focus-within:ring-[#1456f0]">
                      <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                        <span className="text-sm">🇮🇳</span>
                        <span>{formData.phoneCountryCode}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        placeholder="7788994455"
                        className="w-full px-3 py-2.5 text-xs bg-transparent text-slate-900 dark:text-white font-medium focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Field 4: GENDER */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Gender
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange("gender", e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      >
                        <option value="">Select option</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 5: BIRTH DATE */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Birth Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange("birthDate", e.target.value)}
                        placeholder="dd-mm-yyyy"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: PREFERENCES */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Preferences</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preference 1: LANGUAGE */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Language
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.language}
                        onChange={(e) => handleInputChange("language", e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      >
                        <option value="English (English)">English (English)</option>
                        <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                        <option value="Spanish (Español)">Spanish (Español)</option>
                        <option value="French (Français)">French (Français)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Preference 2: COUNTRY */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Country
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Preference 3: TIMEZONE */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Timezone
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleInputChange("timezone", e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium appearance-none focus:outline-hidden focus:ring-1 focus:ring-[#1456f0]"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                        <option value="America/New_York">America/New_York (EST -5:00)</option>
                        <option value="Europe/London">Europe/London (GMT +0:00)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS: Save Changes & Discard */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>

                <button
                  type="button"
                  onClick={handleDiscard}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2 CONTENT: SECURITY
              ===================================================================== */}
          {activeTab === "security" && (
            <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
                  Security Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your password and authentication controls
                </p>
              </div>

              {/* Password update form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Update Password</span>
                </div>

                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Current Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentPassword || !newPassword) {
                        toast.error("Please fill in current and new passwords");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        toast.error("New passwords do not match");
                        return;
                      }
                      toast.success("Password updated successfully");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all active:scale-95"
                  >
                    <span>Update Password</span>
                  </button>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Two-Factor Authentication (2FA)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Receive an SMS verification code whenever accessing sensitive records
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      toast.success(
                        !twoFactorEnabled ? "2FA Enabled for mobile login" : "2FA Disabled"
                      );
                    }}
                    className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      twoFactorEnabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3 CONTENT: NOTIFICATIONS
              ===================================================================== */}
          {activeTab === "notifications" && (
            <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
                  Notification Preferences
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure channels for appointments, prescriptions, and status alerts
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                {/* Channel 1: Video Link & Appointment Reminders via Email */}
                <div className="flex items-center justify-between pt-3 first:pt-0">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Email Appointment Reminders &amp; Video Links
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sends Google Meet / video links and calendar invites to {formData.email}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptEmail}
                    onChange={(e) => {
                      setNotifyApptEmail(e.target.checked);
                      toast.success("Notification preferences updated");
                    }}
                    className="w-4 h-4 rounded text-[#1456f0] focus:ring-[#1456f0] cursor-pointer"
                  />
                </div>

                {/* Channel 2: SMS Alerts */}
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      SMS Status &amp; Arrival Fast Pass
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sends arrival notifications and queue updates to +91 {formData.phoneNumber}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptSMS}
                    onChange={(e) => {
                      setNotifyApptSMS(e.target.checked);
                      toast.success("Notification preferences updated");
                    }}
                    className="w-4 h-4 rounded text-[#1456f0] focus:ring-[#1456f0] cursor-pointer"
                  />
                </div>

                {/* Channel 3: WhatsApp Updates */}
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      WhatsApp Digital Records &amp; Prescriptions
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Instantly receive verified prescription PDFs and surgical instructions on WhatsApp
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyApptWhatsApp}
                    onChange={(e) => {
                      setNotifyApptWhatsApp(e.target.checked);
                      toast.success("Notification preferences updated");
                    }}
                    className="w-4 h-4 rounded text-[#1456f0] focus:ring-[#1456f0] cursor-pointer"
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
