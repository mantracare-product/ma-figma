import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import { getClientList, ClientItem } from "../../../lib/getClientList";
import { useEligibility } from "../../context/RcmContext";
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  MoreVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface IntakeTask {
  clientId: string;
  clientName: string;
  phone: string;
  email: string;
  lastContact: string;
  policyStatus: "missing" | "expired" | "flagged_missing";
  taskStatus: "not_started" | "in_progress" | "completed";
  notes?: string;
}

export default function InsuranceIntake() {
  const navigate = useNavigate();
  const { eligibilityChecks } = useEligibility();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showHelp, setShowHelp] = useState(false);

  // Store intake task status locally in sessionStorage so user marks persist
  const [tasksStatusMap, setTasksStatusMap] = useState<Record<string, "not_started" | "in_progress" | "completed">>(() => {
    try {
      const saved = sessionStorage.getItem("mantra_insurance_intake_tasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveTaskStatus = (clientId: string, newStatus: "not_started" | "in_progress" | "completed") => {
    const updated = { ...tasksStatusMap, [clientId]: newStatus };
    setTasksStatusMap(updated);
    try {
      sessionStorage.setItem("mantra_insurance_intake_tasks", JSON.stringify(updated));
    } catch {}
    toast.success(`Patient task status updated to ${newStatus.replace("_", " ")}`);
  };

  const clients = useMemo(() => getClientList(), []);

  // Compute intake queue: clients who don't have active insurance, are marked Missing, or have inactive checks
  const intakeList: IntakeTask[] = useMemo(() => {
    // Load clients from storage to check for insurance fields
    let storedClients: any[] = [];
    try {
      const raw = sessionStorage.getItem("clients");
      if (raw) storedClients = JSON.parse(raw);
    } catch {}

    const list: IntakeTask[] = [];

    clients.forEach((c) => {
      const stored = storedClients.find((sc) => String(sc.id) === String(c.id));
      const elg = eligibilityChecks.find((e) => e.clientId === c.id);

      const hasValidInsurance =
        (stored?.insurance?.payerName &&
          stored.insurance.payerName !== "Missing Insurance" &&
          stored.insurance.payerName !== "Self Pay") ||
        (elg && elg.status === "active");

      if (hasValidInsurance) {
        // If completed or updated, it disappears or can be shown if filter === 'completed'
        return;
      }

      let policyStatus: "missing" | "expired" | "flagged_missing" = "missing";
      if (stored?.insurance?.payerName === "Missing Insurance") {
        policyStatus = "flagged_missing";
      } else if (elg?.status === "inactive") {
        policyStatus = "expired";
      }

      list.push({
        clientId: c.id,
        clientName: c.name,
        phone: c.phoneNumber || "",
        email: c.email || "",
        lastContact: "2026-09-02",
        policyStatus,
        taskStatus: tasksStatusMap[c.id] || "not_started",
      });
    });

    return list;
  }, [clients, eligibilityChecks, tasksStatusMap]);

  const filtered = intakeList.filter((item) => {
    const matchesSearch =
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.clientId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : item.taskStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const notStartedCount = intakeList.filter((t) => t.taskStatus === "not_started").length;
  const inProgressCount = intakeList.filter((t) => t.taskStatus === "in_progress").length;
  const completedCount = intakeList.filter((t) => t.taskStatus === "completed").length;

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <PageHeader
        title="Insurance Intake Worklist"
        subtitle="Upstream queue of patients with missing, unverified, or expired insurance coverage"
        actions={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Needs Outreach (Not Started)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
              {notStartedCount}
            </span>
            <span className="text-xs text-rose-600 font-semibold">Patients</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            In Progress (Contacted)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {inProgressCount}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Active Follow-up</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Queue Resolved
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {completedCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Completed</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {["all", "not_started", "in_progress", "completed"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Policy Status</th>
                <th className="px-5 py-3">Last Outreach</th>
                <th className="px-5 py-3 text-center">Task Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-700">Insurance Intake Queue is Clear</p>
                    <p className="text-xs text-slate-400 mt-1">
                      All patients have active insurance policies on file or are confirmed as self-pay.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.clientId}
                    onClick={() => navigate(`/clients/${item.clientId}?tab=billing&editInsurance=true`)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {item.clientName}
                        <ExternalLink className="w-3 h-3 text-blue-500 opacity-60" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{item.clientId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{item.phone || "No phone on file"}</div>
                      <div className="text-[10px] text-slate-400">{item.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {item.policyStatus === "flagged_missing" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Flagged Missing
                        </span>
                      ) : item.policyStatus === "expired" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Coverage Terminated / Expired
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          No Policy on File
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                      {item.lastContact}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.taskStatus === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.taskStatus === "in_progress"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.taskStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveTaskStatus(item.clientId, "in_progress")}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[11px] font-semibold transition-colors"
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => saveTaskStatus(item.clientId, "completed")}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/clients/${item.clientId}?tab=billing&editInsurance=true`)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Open Client Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Insurance Intake Works"
        summary="Upstream worklist identifying every patient without active verified insurance before appointments take place."
        bullets={[
          "Front Door Triage: Catch missing insurance before the day of visit rather than scrambling at check-in.",
          "Direct Profile Deep-Link: Clicking any row navigates directly to the patient's editable Insurance section in their profile.",
          "Task Tracking: Track outreach from 'Not Started' through 'In Progress' to 'Completed'.",
          "Automatic Clearance: Once insurance is saved on a client's profile, they automatically clear from this queue and become active in Pre-Visit & Eligibility checks.",
        ]}
      />
    </div>
  );
}
