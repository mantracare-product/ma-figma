import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  User,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Clock,
  Globe,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { addOrUpdateClient, Client } from "../../../lib/clientsStore";
import { getStoredTeamMembers } from "../../../lib/teamStore";
import { useOrganization } from "../../context/OrganizationContext";
import maLogo from "../../../imports/ma_logo-1.png";

const COUNTRIES = [
  { flag: "🇺🇸", code: "+1", country: "US" },
  { flag: "🇮🇳", code: "+91", country: "IN" },
  { flag: "🇬🇧", code: "+44", country: "GB" },
  { flag: "🇦🇪", code: "+971", country: "AE" },
  { flag: "🇨🇦", code: "+1", country: "CA" },
  { flag: "🇦🇺", code: "+61", country: "AU" },
  { flag: "🇩🇪", code: "+49", country: "DE" },
  { flag: "🇸🇬", code: "+65", country: "SG" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export default function PatientRegisterScreen() {
  const navigate = useNavigate();

  const team = getStoredTeamMembers().filter((m) => m.status !== false);
  const doctorList = team.filter((m) => m.canBookAppointments !== false);
  const doctors = doctorList.length > 0 ? doctorList : team;

  const { activeOrganization } = useOrganization();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    countryFlag: "🇺🇸",
    countryCode: "+1",
    country: "US",
    phone: "",
    email: "",
    companyName: "",
    jobPosition: "",
    numberOfEmployees: "",
  });

  const [showAdditional, setShowAdditional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = formData.phone.startsWith("+")
        ? formData.phone
        : `${formData.countryCode} ${formData.phone.trim()}`;

      // Save directly into Mantra Assist central reactive store
      const newClient = addOrUpdateClient({
        name: formData.name.trim(),
        phone: fullPhone,
        email: formData.email.trim(),
        country: formData.country,
        countryCode: formData.countryCode,
        countryFlag: formData.countryFlag,
        responsible: doctors[0]?.name || "John Smith",
        preferredCallingTime: "10:00",
        timezone: "America/New_York",
        companyName: formData.companyName.trim() || undefined,
        jobPosition: formData.jobPosition.trim() || undefined,
        numberOfEmployees: formData.numberOfEmployees.trim() || undefined,
        source: "MA-Client",
        processes: ["Appointment Scheduling"],
        stage: "Confirmed",
        status: "Active",
      });

      // Set as active client in portal session and storage
      sessionStorage.setItem("patient_portal_active_client_id", newClient.id);
      localStorage.setItem("patient_portal_active_client_id", newClient.id);
      window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: newClient.id }));

      toast.success(`Registration complete! Welcome, ${newClient.name}.`);
      navigate(`/patient/${encodeURIComponent(newClient.id)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to register patient profile");
      setIsSubmitting(false);
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
      <div className="max-w-xl w-full mx-auto my-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Top Bar Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

          {/* Centered Heading: Big Organization Name & Patient Registration */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {activeOrganization?.name || "Demo Mantra Care"}
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patient Registration
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto" style={{ fontFamily: "Outfit, sans-serif" }}>
              Please enter your details below to register and access your care portal.
            </p>
          </div>

          {/* QR Scan Context Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Scanned QR Code for {activeOrganization?.name || "Clinic"}
              </p>
              <p className="text-[11px] text-slate-600 leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome to {activeOrganization?.name || "our clinic"}! Registering links your profile directly to the front desk.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  required
                />
              </div>
            </div>

            {/* 2. Phone Number with Country Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={`${formData.countryFlag}|${formData.countryCode}|${formData.country}`}
                  onChange={(e) => {
                    const [flag, code, country] = e.target.value.split("|");
                    setFormData({ ...formData, countryFlag: flag, countryCode: code, country });
                  }}
                  className="w-28 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={`${c.flag}-${c.code}-${c.country}`} value={`${c.flag}|${c.code}|${c.country}`}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="5551234567"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </div>

            {/* Progressive Disclosure: Additional Context (Company, Role) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdditional(!showAdditional)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 flex items-center justify-between transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span>Additional Professional & Company Details (Optional)</span>
                {showAdditional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdditional && (
                <div className="mt-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Company / Workplace
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Job Position
                      </label>
                      <input
                        type="text"
                        value={formData.jobPosition}
                        onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                        placeholder="e.g. Product Designer"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Employees
                      </label>
                      <input
                        type="text"
                        value={formData.numberOfEmployees}
                        onChange={(e) => setFormData({ ...formData, numberOfEmployees: e.target.value })}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <span>{isSubmitting ? "Creating Profile..." : "Complete Registration & Enter Portal"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Already have an account link */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              Already registered in clinic records?{" "}
              <Link to="/patient/login" className="text-blue-600 hover:underline font-bold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Registered data syncs directly with Mantra Assist and AI Receptionist kiosk</span>
      </div>
    </div>
  );
}
