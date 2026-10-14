import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getStoredClients, saveStoredClients, Client } from "../../../lib/clientsStore";
import { useOrganization } from "../../context/OrganizationContext";
import maLogo from "../../../imports/ma_logo-1.png";

export default function PatientLoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeOrganization } = useOrganization();
  const paramClientId = searchParams.get("clientId") || searchParams.get("id");

  const clients = getStoredClients();
  const initialClient = paramClientId ? clients.find((c) => c.id === paramClientId) : null;
  const isInvite = Boolean(paramClientId && initialClient);

  // Invite Flow State: Pre-filled email, empty password & confirm password
  const [inviteEmail, setInviteEmail] = useState(() => (initialClient?.email || initialClient?.phone || ""));
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState("");

  // Direct Route Login State: Email and password must both be empty
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Handle setting password and continuing from invite link
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!initialClient) return;

    if (!invitePassword.trim()) {
      setError("Please set a password.");
      return;
    }
    if (invitePassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (invitePassword !== inviteConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    // Save client password and updated email if changed
    const updatedClients = clients.map((c) =>
      c.id === initialClient.id
        ? {
            ...c,
            portalPassword: invitePassword,
            email: inviteEmail.trim() || c.email,
          }
        : c
    );
    saveStoredClients(updatedClients);

    sessionStorage.setItem("patient_portal_active_client_id", initialClient.id);
    localStorage.setItem("patient_portal_active_client_id", initialClient.id);
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: initialClient.id }));
    toast.success(`Welcome, ${initialClient.name}! Your password has been set.`);
    navigate(`/patient/${encodeURIComponent(initialClient.id)}`);
  };

  // Handle direct login from route
  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, "");

    if (!cleanInput) {
      setError("Please enter your email or phone number.");
      return;
    }
    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

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
      // If client has a custom portalPassword set, check that it matches
      if ((match as any).portalPassword && (match as any).portalPassword !== loginPassword) {
        setError("Incorrect password. Please try again or use your invite link.");
        return;
      }

      sessionStorage.setItem("patient_portal_active_client_id", match.id);
      localStorage.setItem("patient_portal_active_client_id", match.id);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: match.id }));
      navigate(`/patient/${encodeURIComponent(match.id)}`);
    } else {
      if (clients.length > 0) {
        setError(`Patient not found with identifier "${identifier}". Please verify your details or contact the clinic reception.`);
      } else {
        setError("No patient profile found. Please contact the clinic reception.");
      }
    }
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
              {isInvite ? "Set Up Your Password" : "Patient Portal Sign In"}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
              {isInvite
                ? `Welcome, ${initialClient?.name}! Please set your account password below to access your care portal.`
                : "Sign in to manage appointments, digital clinic bills, and patient records."}
            </p>
          </div>

          {/* Form: Invite Flow vs Direct Route Login */}
          {isInvite ? (
            /* Invite Flow: Email pre-filled, Set Password, Confirm Password, Continue button */
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. patient@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Set Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Enter password (min. 4 characters)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={inviteConfirmPassword}
                    onChange={(e) => setInviteConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
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
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Direct Route Login Flow: Email & Password empty */
            <form onSubmit={handleDirectLogin} className="space-y-4">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
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
          )}
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
