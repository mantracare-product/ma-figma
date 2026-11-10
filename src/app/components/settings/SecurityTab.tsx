import React, { useState } from "react";
import { ShieldCheck, Smartphone, Laptop, Globe, CheckCircle2, Lock } from "lucide-react";
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [preferredMfaMethod, setPreferredMfaMethod] = useState("totp");

  return (
    <div className="space-y-6">
      {/* 1. Two-Factor Authentication Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3
                className="text-xs font-bold uppercase tracking-wider text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Two-Factor Authentication (2FA)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Protect your account by requiring an extra verification method upon sign in.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                twoFactorEnabled
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked);
                toast.success(
                  checked
                    ? "Two-factor authentication enabled"
                    : "Two-factor authentication disabled"
                );
              }}
            />
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="pt-2 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Preferred MFA Method
            </label>
            <div className="max-w-md">
              <Select
                value={preferredMfaMethod}
                onValueChange={(val) => {
                  setPreferredMfaMethod(val);
                  toast.success("Preferred MFA method updated");
                }}
              >
                <SelectTrigger className="w-full bg-white border border-[#E2E8F0] rounded-xl text-xs h-9">
                  <SelectValue placeholder="Select MFA method" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg z-[10000]">
                  <SelectItem value="totp" className="text-xs cursor-pointer">
                    Authenticator App (TOTP)
                  </SelectItem>
                  <SelectItem value="sms" className="text-xs cursor-pointer">
                    SMS Verification Code
                  </SelectItem>
                  <SelectItem value="email" className="text-xs cursor-pointer">
                    Email Verification Code
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-slate-400">
              When signing in, you will be prompted for a verification code using this method.
            </p>
          </div>
        )}
      </div>

      {/* 2. Active Sessions Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3
            className="text-xs font-bold uppercase tracking-wider text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Active Sessions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Devices and browser sessions currently logged into this account.
          </p>
        </div>

        <div className="space-y-3">
          {/* Current Session */}
          <div className="p-3.5 rounded-xl border border-blue-200/70 bg-blue-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-blue-200/80 text-[#1456f0] flex items-center justify-center shadow-2xs">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Chrome on Windows 11
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Current Session
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    San Francisco, CA, USA
                  </span>
                  <span>·</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    192.168.1.145
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
              Active now
            </span>
          </div>

          {/* Past Session */}
          <div className="p-3.5 rounded-xl border border-gray-200/80 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-slate-600 flex items-center justify-center shadow-2xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Safari on iOS (iPhone 15 Pro)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    New York, NY, USA
                  </span>
                  <span>·</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    74.125.210.82
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">
              Last active 2 hours ago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityTab;

