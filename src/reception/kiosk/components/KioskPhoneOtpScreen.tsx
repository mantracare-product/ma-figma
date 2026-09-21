/**
 * KioskPhoneOtpScreen.tsx
 * Path: src/reception/kiosk/components/KioskPhoneOtpScreen.tsx
 *
 * Touch numeric keypad input for phone entry, demo OTP verification (1234),
 * and family member / patient profile selection.
 */

import React, { useState } from "react";
import {
  Phone,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  UserPlus,
  Delete,
  RotateCcw,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { PatientSummary } from "../../types/reception";
import type { KioskLanguage } from "../i18n";
import { TRANSLATIONS } from "../i18n";

interface KioskPhoneOtpScreenProps {
  language: KioskLanguage;
  flow: "checkin" | "walkin";
  onBack: () => void;
  onPatientSelected: (patient: PatientSummary, sessionToken: string) => void;
}

export const KioskPhoneOtpScreen: React.FC<KioskPhoneOtpScreenProps> = ({
  language,
  flow,
  onBack,
  onPatientSelected,
}) => {
  const t = TRANSLATIONS[language];
  const maClient = getMaClient();

  // Sub-steps: 'phone' -> 'otp' -> 'profile_select' | 'new_profile'
  const [subStep, setSubStep] = useState<"phone" | "otp" | "profile_select" | "new_profile">("phone");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // New Profile form state
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("Male");

  // Keypad Handlers
  const handleKeypadPress = (val: string) => {
    if (subStep === "phone") {
      if (phoneNumber.length < 10) {
        setPhoneNumber((prev) => prev + val);
      }
    } else if (subStep === "otp") {
      if (otpValue.length < 4) {
        const nextOtp = otpValue + val;
        setOtpValue(nextOtp);
        if (nextOtp.length === 4) {
          handleVerifyOtp(nextOtp);
        }
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (subStep === "phone") {
      setPhoneNumber((prev) => prev.slice(0, -1));
    } else if (subStep === "otp") {
      setOtpValue((prev) => prev.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    if (subStep === "phone") setPhoneNumber("");
    if (subStep === "otp") setOtpValue("");
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (phoneNumber.length < 7) {
      toast.error("Please enter a valid mobile number.");
      return;
    }
    const fullPhone = `${countryCode}${phoneNumber}`;
    setLoading(true);
    try {
      await maClient.sendOtp(fullPhone);
      toast.success(`Demo OTP code: 1234`, { duration: 6000 });
      setSubStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue;
    if (code.length < 4) {
      toast.error("Please enter the 4-digit code.");
      return;
    }
    const fullPhone = `${countryCode}${phoneNumber}`;
    setLoading(true);
    try {
      const res = await maClient.verifyOtp(fullPhone, code);
      setSessionToken(res.sessionToken);

      // Lookup patients by phone
      const foundPatients = await maClient.lookupClientsByPhone(fullPhone, res.sessionToken);
      setPatients(foundPatients);

      if (foundPatients.length === 1) {
        // Single patient found -> auto-select
        onPatientSelected(foundPatients[0], res.sessionToken);
      } else if (foundPatients.length > 1) {
        // Multiple family members -> show picker
        setSubStep("profile_select");
      } else {
        // New patient not in database -> prompt for name
        setSubStep("new_profile");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code. Enter 1234.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create New Profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      toast.error("Please enter the patient's name.");
      return;
    }
    const fullPhone = `${countryCode}${phoneNumber}`;
    setLoading(true);
    try {
      const created = await maClient.createWalkInClient(
        {
          name: newPatientName.trim(),
          phone: fullPhone,
          age: newPatientAge ? parseInt(newPatientAge, 10) : undefined,
          gender: newPatientGender,
          relation: "Self",
        },
        sessionToken
      );
      toast.success(`Profile created for ${created.name}`);
      onPatientSelected(created, sessionToken);
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full select-none font-['Outfit']">
      {/* Back Button */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => {
            if (subStep === "otp") setSubStep("phone");
            else if (subStep === "profile_select" || subStep === "new_profile") setSubStep("otp");
            else onBack();
          }}
          className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backBtn}
        </button>

        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {flow === "checkin" ? "Appointment Check-in" : "Walk-in Registration"}
        </span>
      </div>

      {/* SUB-STEP 1: PHONE NUMBER & KEYPAD */}
      {subStep === "phone" && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <Phone className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{t.phonePrompt}</h3>
            <p className="text-xs text-slate-400">{t.phoneSubtitle}</p>
          </div>

          {/* Number Display */}
          <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-700 rounded-2xl">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-slate-800 text-white text-sm font-bold px-3 py-2 rounded-xl outline-none border border-slate-700 cursor-pointer"
            >
              <option value="+1">🇺🇸 +1</option>
              <option value="+91">🇮🇳 +91</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+971">🇦🇪 +971</option>
            </select>
            <div className="flex-1 font-mono text-2xl font-black tracking-wider px-3 text-blue-400 min-h-[40px] flex items-center">
              {phoneNumber || <span className="text-slate-600 font-sans font-normal text-base">555-000-0000</span>}
            </div>
          </div>

          {/* On-screen Touch Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xl font-bold text-white border border-slate-700/60 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 border border-slate-700/40 active:scale-95 transition-all cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xl font-bold text-white border border-slate-700/60 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-slate-700/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            disabled={phoneNumber.length < 5 || loading}
            onClick={handleSendOtp}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {loading ? "Verifying..." : t.sendOtp}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* SUB-STEP 2: OTP VERIFICATION */}
      {subStep === "otp" && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{t.otpPrompt}</h3>
            <p className="text-xs text-slate-400">
              {t.otpSubtitle} <span className="font-bold text-white font-mono">{countryCode} {phoneNumber}</span>
            </p>
          </div>

          {/* 4-Box OTP Display */}
          <div className="flex justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-14 h-16 rounded-2xl border flex items-center justify-center text-3xl font-mono font-bold transition-all ${
                  otpValue[idx]
                    ? "bg-slate-950 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20"
                    : "bg-slate-950/60 border-slate-700 text-slate-600"
                }`}
              >
                {otpValue[idx] || "•"}
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
            <p className="text-xs font-semibold text-emerald-400">{t.demoOtpHint}</p>
          </div>

          {/* Keypad for OTP */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num.toString())}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xl font-bold text-white border border-slate-700/60 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 border border-slate-700/40 active:scale-95 transition-all cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xl font-bold text-white border border-slate-700/60 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-slate-700/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-STEP 3: MULTIPLE PATIENT PROFILES FOUND */}
      {subStep === "profile_select" && (
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{t.selectPatient}</h3>
            <p className="text-xs text-slate-400">{t.selectPatientSubtitle}</p>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {patients.map((pat) => (
              <button
                key={pat.id}
                type="button"
                onClick={() => onPatientSelected(pat, sessionToken)}
                className="w-full p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-2xl text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {pat.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {pat.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {pat.relation || "Self"} {pat.age ? `• ${pat.age} yrs` : ""} {pat.gender ? `• ${pat.gender}` : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSubStep("new_profile")}
            className="w-full py-3.5 border border-dashed border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {t.createNewProfile}
          </button>
        </div>
      )}

      {/* SUB-STEP 4: NEW PATIENT PROFILE CREATION */}
      {subStep === "new_profile" && (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <UserPlus className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Patient Details</h3>
            <p className="text-xs text-slate-400">
              Enter details for phone: <span className="font-mono text-white font-bold">{countryCode} {phoneNumber}</span>
            </p>
          </div>

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="e.g. Johnathan Doe"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gender</label>
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {loading ? "Creating..." : "Save & Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
