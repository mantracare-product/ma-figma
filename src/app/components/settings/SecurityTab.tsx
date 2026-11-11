import React, { useState } from "react";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  CheckCircle2,
  Lock,
  KeyRound,
  Clock,
  ChevronDown,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  Shield,
  RotateCcw,
} from "lucide-react";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

export interface SecurityTabProps {
  member?: any;
}

export function SecurityTab({ member }: SecurityTabProps) {
  // Accordion active expanded rows
  const [openRow, setOpenRow] = useState<string | null>("password");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [forcePasswordReset, setForcePasswordReset] = useState(false);
  const [passwordLastUpdated, setPasswordLastUpdated] = useState("30 days ago");

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [preferredMfaMethod, setPreferredMfaMethod] = useState("totp");

  // Session Timeout
  const [sessionTimeout, setSessionTimeout] = useState("15");
  const [lockScreenOnIdle, setLockScreenOnIdle] = useState(true);

  // Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      device: "Chrome on Windows 11",
      location: "San Francisco, CA, USA",
      ip: "192.168.1.145",
      isCurrent: true,
      lastActive: "Active now",
    },
    {
      id: "sess-2",
      device: "Safari on iOS (iPhone 15 Pro)",
      location: "New York, NY, USA",
      ip: "74.125.210.82",
      isCurrent: false,
      lastActive: "2 hours ago",
    },
  ]);

  const toggleRow = (id: string) => {
    setOpenRow((prev) => (prev === id ? null : id));
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    toast.success("Password updated successfully");
    setPasswordLastUpdated("Just now");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleRevokeOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success("All other active sessions have been signed out");
  };

  // Password strength calculation
  const passStrength = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  return (
    <div className="space-y-3" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* ── Accordion Row 1: Password & Credentials ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleRow("password")}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate">
                Password & Credentials
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Manage login security, credential rules, and password change
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Updated {passwordLastUpdated}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                openRow === "password" ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openRow === "password" && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
            <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-lg">
              {/* Current Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {newPassword && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full ${
                            passStrength >= step
                              ? passStrength >= 3
                                ? "bg-emerald-500"
                                : passStrength === 2
                                ? "bg-amber-500"
                                : "bg-rose-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Strength: {passStrength >= 3 ? "Strong" : passStrength === 2 ? "Moderate" : "Weak"}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Force Reset Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Require password change on next sign in</p>
                  <p className="text-[11px] text-slate-500">Forces user to choose a new password upon their next login</p>
                </div>
                <Switch
                  checked={forcePasswordReset}
                  onCheckedChange={(checked) => {
                    setForcePasswordReset(checked);
                    toast.success(checked ? "User will be prompted to reset password on next login" : "Password change on login disabled");
                  }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Accordion Row 2: Two-Factor Authentication (2FA) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleRow("2fa")}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate">
                Two-Factor Authentication (2FA)
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Protect account with an extra verification step upon sign in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                twoFactorEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {twoFactorEnabled ? "Enabled (TOTP)" : "Disabled"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                openRow === "2fa" ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openRow === "2fa" && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Enable 2FA Verification</p>
                <p className="text-[11px] text-slate-500">Require an authenticator code or SMS code at sign in</p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => {
                  setTwoFactorEnabled(checked);
                  toast.success(checked ? "2FA enabled" : "2FA disabled");
                }}
              />
            </div>

            {twoFactorEnabled && (
              <div className="pt-2 space-y-3 max-w-md">
                <label className="block text-xs font-semibold text-slate-700">Preferred Verification Method</label>
                <Select
                  value={preferredMfaMethod}
                  onValueChange={(val) => {
                    setPreferredMfaMethod(val);
                    toast.success("MFA method updated");
                  }}
                >
                  <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9">
                    <SelectValue placeholder="Select MFA method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg z-[10000]">
                    <SelectItem value="totp" className="text-xs cursor-pointer">
                      Authenticator App (Google / 1Password)
                    </SelectItem>
                    <SelectItem value="sms" className="text-xs cursor-pointer">
                      SMS Verification Code
                    </SelectItem>
                    <SelectItem value="email" className="text-xs cursor-pointer">
                      Email Security Code
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  When signing in, you will be prompted for a 6-digit code via this channel.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Accordion Row 3: Active Sessions & Devices ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleRow("sessions")}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate">
                Active Sessions & Devices
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Devices and browser sessions currently logged into this account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {sessions.length} Active
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                openRow === "sessions" ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openRow === "sessions" && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    s.isCurrent ? "border-blue-200/80 bg-blue-50/30" : "border-slate-200/80 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      {s.device.toLowerCase().includes("iphone") ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{s.device}</span>
                        {s.isCurrent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{s.location}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-600">{s.ip}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-600">{s.lastActive}</span>
                </div>
              ))}
            </div>

            {sessions.length > 1 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRevokeOtherSessions}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Sign out of all other devices
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Accordion Row 4: Session Inactivity Timeout ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleRow("timeout")}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate">
                Session Inactivity Timeout
              </h4>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Automatically lock or sign out after an idle window
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {sessionTimeout} min
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                openRow === "timeout" ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {openRow === "timeout" && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
            <div className="max-w-md space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Idle Timeout Duration</label>
              <Select
                value={sessionTimeout}
                onValueChange={(val) => {
                  setSessionTimeout(val);
                  toast.success(`Session timeout set to ${val} minutes`);
                }}
              >
                <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9">
                  <SelectValue placeholder="Select timeout" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg z-[10000]">
                  <SelectItem value="15" className="text-xs cursor-pointer">15 minutes (High Security)</SelectItem>
                  <SelectItem value="30" className="text-xs cursor-pointer">30 minutes</SelectItem>
                  <SelectItem value="60" className="text-xs cursor-pointer">1 hour</SelectItem>
                  <SelectItem value="240" className="text-xs cursor-pointer">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">Lock screen instead of logout</p>
                <p className="text-[11px] text-slate-500">Require PIN or password to unlock without ending background tasks</p>
              </div>
              <Switch
                checked={lockScreenOnIdle}
                onCheckedChange={(checked) => {
                  setLockScreenOnIdle(checked);
                  toast.success(checked ? "Screen lock on idle enabled" : "Screen lock disabled");
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SecurityTab;
