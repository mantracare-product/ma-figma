import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import {
  User,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  UserPlus,
  Building2,
} from "lucide-react";
import { getStoredClients, Client } from "../../../lib/clientsStore";
import { useOrganization } from "../../context/OrganizationContext";
import maLogo from "../../../imports/ma_logo-1.png";

export default function PatientLoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeOrganization } = useOrganization();
  const paramClientId = searchParams.get("clientId") || searchParams.get("id");

  const clients = getStoredClients();
  const initialClient = paramClientId ? clients.find((c) => c.id === paramClientId) : null;

  const [identifier, setIdentifier] = useState(
    initialClient ? initialClient.phone || initialClient.email : ""
  );
  const [passcode, setPasscode] = useState("1234");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanInput = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, "");

    // Look for matching client by ID, phone, or email
    const match = clients.find((c) => {
      if (c.id.toLowerCase() === cleanInput) return true;
      if (c.email && c.email.toLowerCase() === cleanInput) return true;
      const cDigits = (c.phone || (c as any).phoneNumber || "").replace(/\D/g, "");
      if (cleanDigits && cDigits && (cDigits === cleanDigits || cDigits.endsWith(cleanDigits) || cleanDigits.endsWith(cDigits))) {
        return true;
      }
      return false;
    });

    if (match) {
      sessionStorage.setItem("patient_portal_active_client_id", match.id);
      localStorage.setItem("patient_portal_active_client_id", match.id);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: match.id }));
      navigate(`/patient/${encodeURIComponent(match.id)}`);
    } else {
      // If user typed anything else, default to first client or show error
      if (clients.length > 0) {
        setError(`Patient not found with identifier "${identifier}". Select an existing patient or create an account.`);
      } else {
        setError("No patients found in database. Please register as a new patient.");
      }
    }
  };

  const handleSelectDevPatient = (patientId: string) => {
    sessionStorage.setItem("patient_portal_active_client_id", patientId);
    localStorage.setItem("patient_portal_active_client_id", patientId);
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: patientId }));
    navigate(`/patient/${encodeURIComponent(patientId)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <img src={maLogo} alt="Mantra Assist" className="h-6 w-auto object-contain" />
          <div className="h-4 w-px bg-slate-300" />
          <span className="text-xs font-bold text-slate-600 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Client Portal
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Subtle Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {activeOrganization?.name || "Demo Mantra Care"}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patient Portal Sign In
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
              Sign in to manage appointments, digital clinic bills, and QR check-in passes.
            </p>
          </div>

          {/* If redirected with clientId, show greeting */}
          {initialClient && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {(initialClient.name || "P").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Hello, {initialClient.name}!
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Personal invite detected for patient #{initialClient.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectDevPatient(initialClient.id)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
              >
                Enter →
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Phone Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 5551234567 or sarah.j@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Passcode / OTP
                </label>
                <span className="text-[11px] text-blue-600 font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Demo PIN: 1234
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="1234"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Register Link */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              New patient or scanned the clinic QR?{" "}
              <Link
                to="/patient/register"
                className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Register here</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-5xl w-full mx-auto text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Connected to centralized Mantra Assist healthcare database</span>
      </div>
    </div>
  );
}
