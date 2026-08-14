import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Search, Plus, Eye, MoreVertical, Copy, FileText, X,
  Edit2, Share2, Trash2, ArrowLeft, ChevronRight, Type,
  Mail, Phone, AlignLeft, Hash, Link2, Info, GripVertical,
  ChevronUp, ChevronDown, Pencil, FlaskConical
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import { FieldDef, Form, INITIAL_FORMS } from "../../data/forms";
import { FlowStep, IntakeFlow, INITIAL_FLOWS } from "../../data/intakeFlows";
import ClientProfile, { Client, initialClients } from "./ClientProfile";
import ShareFormDrawer from "../components/webform/ShareFormDrawer";
import { ShareClient, ShareLiteralRecipient, ShareChannel, ShareTarget, ShareTargetKind } from "../components/webform/shareTypes";
import { useClientFields } from "../context/ClientFieldsContext";
import { appendClientSubmission } from "../../data/submissionsStore";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";

// ─── Data ────────────────────────────────────────────────────────────────────

export type Submission = {
  id: number;
  clientId: string;
  formId: number;
  name: string;
  email: string;
  date: string;
  status?: string;
  fields: Record<string, string>;
  metaLeadSource?: {
    campaign: string;
    adSet: string;
    adName: string;
    formName: string;
    submittedAt: string;
    metaLeadId: string;
  };
};

const DUMMY_SUBMISSIONS_SEED: Submission[] = [
  {
    id: 1, clientId: "CL-001", formId: 1, name: "Sarah Johnson", email: "sarah.j@email.com", date: "Jun 12, 2026", status: "completed",
    fields: { "Full Name": "Sarah Johnson", "Email": "sarah.j@email.com", "Phone": "+1 5551234567", "Message": "I'd like to learn more about your AI features." },
    metaLeadSource: {
      campaign: "Healthcare June Campaign",
      adSet: "Delhi 25-45",
      adName: "Video Ad 1",
      formName: "Healthcare Campaign Form",
      submittedAt: "Jun 12, 2026 2:34 PM",
      metaLeadId: "123456789101112",
    },
  },
  {
    id: 2, clientId: "CL-002", formId: 2, name: "Michael Chen", email: "mchen@email.com", date: "Jun 11, 2026", status: "sent",
    fields: { "First Name": "Michael", "Last Name": "Chen", "Work Email": "mchen@email.com", "Company": "Innovate Solutions", "Team Size": "51–100", "What are you looking for?": "We need an AI receptionist for our support team." },
  },
  {
    id: 3, clientId: "CL-003", formId: 4, name: "Emily Davis", email: "emily.d@email.com", date: "Jun 11, 2026", status: "completed",
    fields: { "Name": "Emily Davis", "Email": "emily.d@email.com" },
  },
  {
    id: 4, clientId: "CL-004", formId: 1, name: "Robert Wilson", email: "rwilson@email.com", date: "Jun 10, 2026", status: "pending",
    fields: { "Full Name": "Robert Wilson", "Email": "rwilson@email.com", "Phone": "+1 5554567890", "Message": "Can you integrate with HubSpot?" },
    metaLeadSource: {
      campaign: "Free Consultation Campaign",
      adSet: "Mumbai 30-50",
      adName: "Carousel Ad 2",
      formName: "Free Consultation Ad",
      submittedAt: "Jun 10, 2026 11:15 AM",
      metaLeadId: "987654321098765",
    },
  },
  {
    id: 5, clientId: "CL-005", formId: 2, name: "Jessica Brown", email: "jbrown@email.com", date: "Jun 9, 2026", status: "completed",
    fields: { "First Name": "Jessica", "Last Name": "Brown", "Work Email": "jbrown@email.com", "Company": "Jessica Brown Corp", "Team Size": "1–10", "What are you looking for?": "Interested in enterprise pricing." },
  },
  {
    id: 6, clientId: "CL-006", formId: 4, name: "David Martinez", email: "d.martinez@email.com", date: "Jun 8, 2026", status: "sent",
    fields: { "Name": "David Martinez", "Email": "d.martinez@email.com" },
  },
  {
    id: 7, clientId: "CL-007", formId: 1, name: "Lisa Anderson", email: "l.anderson@email.com", date: "Jun 7, 2026", status: "failed",
    fields: { "Full Name": "Lisa Anderson", "Email": "l.anderson@email.com", "Phone": "+1 5557890123", "Message": "Looking for a demo of your CRM tools." },
  },
  {
    id: 8, clientId: "CL-008", formId: 2, name: "James Taylor", email: "jtaylor@email.com", date: "Jun 5, 2026", status: "pending",
    fields: { "First Name": "James", "Last Name": "Taylor", "Work Email": "jtaylor@email.com", "Company": "James Taylor Corp", "Team Size": "1–10", "What are you looking for?": "Small agency needing AI scheduling." },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFormDate(dStr: string | undefined) {
  if (!dStr) return "";
  const t = Date.parse(dStr);
  if (isNaN(t)) return dStr;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fieldTypeLabel(type: FieldDef["type"]) {
  const map: Record<string, string> = {
    text: "Text", email: "Email", tel: "Phone", textarea: "Long text",
    number: "Number", url: "URL", select: "Dropdown",
  };
  return map[type] ?? type;
}

function fieldTypeIcon(type: FieldDef["type"]) {
  switch (type) {
    case "email": return <Mail className="w-3.5 h-3.5" />;
    case "tel": return <Phone className="w-3.5 h-3.5" />;
    case "textarea": return <AlignLeft className="w-3.5 h-3.5" />;
    case "number": return <Hash className="w-3.5 h-3.5" />;
    case "url": return <Link2 className="w-3.5 h-3.5" />;
    default: return <Type className="w-3.5 h-3.5" />;
  }
}

function ordinalSuffix(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function getInitials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: "live" | "draft" }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700" style={{ fontFamily: "Outfit, sans-serif" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Live
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
        Draft
      </span>
      <InfoTooltip text="Draft forms don't accept public submissions yet." />
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

// Submission detail drawer
function SubmissionDrawer({ submission, formName, onClose }: {
  submission: Submission | null;
  formName: string;
  onClose: () => void;
}) {
  if (!submission) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-wrap">
          <h2 className="text-base font-bold mr-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
            {submission.name}
          </h2>
          <SubStatusBadge status={submission.status} />
          <span className="text-xs ml-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
            Submission #{submission.id} · {submission.date}
          </span>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-b border-border flex items-center gap-4 text-xs" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{formName}</span>
          <span>·</span>
          <span>{submission.date}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {submission.metaLeadSource && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#1877F2] rounded-md flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="white">
                    <path d="M12 6.073c0-3.315-2.686-6-6-6S0 2.758 0 6.073c0 2.995 2.194 5.477 5.063 5.927V7.77H3.54V6.073h1.523V4.734c0-1.503.896-2.334 2.267-2.334.656 0 1.343.117 1.343.117v1.476h-.756c-.745 0-.977.462-.977.937v1.143h1.664l-.266 1.697H6.94v4.23C9.806 11.55 12 9.068 12 6.073z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-blue-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Meta Lead Source
                </p>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Campaign", value: submission.metaLeadSource.campaign },
                  { label: "Ad Set", value: submission.metaLeadSource.adSet },
                  { label: "Ad Name", value: submission.metaLeadSource.adName },
                  { label: "Form", value: submission.metaLeadSource.formName },
                  { label: "Submitted At", value: submission.metaLeadSource.submittedAt },
                  { label: "Meta Lead ID", value: submission.metaLeadSource.metaLeadId },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-2.5 border border-blue-100">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ fontFamily: "Outfit, sans-serif", color: "#93C5FD" }}>
                      {label}
                    </p>
                    <p className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#1e40af" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.entries(submission.fields).map(([label, value]) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                {label}
              </p>
              <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <button
            className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-black/90 transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif" }}
            onClick={() => { toast.success("Opened contact profile"); onClose(); }}
          >
            View Contact Profile
          </button>
        </div>
      </div>
    </>
  );
}

export const SELECT_STYLE = "px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[140px]";
export const SELECT_INLINE = { fontFamily: "Outfit, sans-serif", color: "#64748B" };

function SubStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
    sent: { bg: "bg-blue-100", text: "text-blue-700", label: "Sent" },
    pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  };
  const s = status && map[status] ? map[status] : { bg: "bg-gray-100", text: "text-gray-600", label: "—" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`} style={{ fontFamily: "Outfit, sans-serif" }}>
      {s.label}
    </span>
  );
}

// Submissions Tab
function SubmissionsTab({ submissions, forms, onViewSubmission }: {
  submissions: Submission[];
  forms: Form[];
  onViewSubmission: (sub: Submission) => void;
}) {
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [subSearch, setSubSearch] = useState("");
  const [subFormFilter, setSubFormFilter] = useState("all");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const formName = (id: number) => forms.find(f => f.id === id)?.name ?? "Unknown";

  const filteredSubs = submissions.filter(sub => {
    const matchesSearch = subSearch === "" ||
      sub.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.email.toLowerCase().includes(subSearch.toLowerCase());
    const matchesForm = subFormFilter === "all" || sub.formId === parseInt(subFormFilter);
    const matchesStatus = subStatusFilter === "all" || sub.status === subStatusFilter;
    return matchesSearch && matchesForm && matchesStatus;
  });

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search submissions…"
            value={subSearch}
            onChange={e => setSubSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>
        <div className="shrink-0">
          <select value={subFormFilter} onChange={e => setSubFormFilter(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
            <option value="all">All Forms</option>
            <optgroup label="Standard">
              <option value="1">Contact Us</option>
              <option value="2">Book a Demo</option>
              <option value="3">Support Request</option>
              <option value="4">Newsletter Signup</option>
            </optgroup>
            <optgroup label="Meta Ads">
              <option value="10">Healthcare Campaign Form</option>
              <option value="11">Free Consultation Ad</option>
            </optgroup>
          </select>
        </div>
        <div className="shrink-0">
          <select value={subStatusFilter} onChange={e => setSubStatusFilter(e.target.value)} className={SELECT_STYLE} style={SELECT_INLINE}>
            <option value="all">Filter</option>
            <option value="completed">Completed</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Form</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Date submitted</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map((sub, i) => (
              <tr
                key={sub.id}
                className={`transition-colors hover:bg-gray-50/60 ${sub.status === "sent" ? "bg-gray-50/60 grayscale-[30%]" : ""
                  } ${i < filteredSubs.length - 1 ? "border-b border-border" : ""}`}
              >
                <td className="px-5 py-3.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: sub.status === "sent" ? "#94A3B8" : "#020817" }}>{sub.name}</span>
                    {!sub.clientId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="5" /><path d="M6 4v3M6 8.5v.5" /></svg>
                        No client linked
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-5 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: sub.status === "sent" ? "#94A3B8" : "#64748B" }}>
                  {sub.email}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                      {formName(sub.formId)}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                  {sub.date}
                </td>
                <td className="px-5 py-3.5">
                  <SubStatusBadge status={sub.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onViewSubmission(sub)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                  >
                    View
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSubs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>No submissions found.</p>
          </div>
        )}
      </div>

      <SubmissionDrawer
        submission={selectedSub}
        formName={selectedSub ? formName(selectedSub.formId) : ""}
        onClose={() => setSelectedSub(null)}
      />
    </>
  );
}



// ─── Form Detail Drawer ───────────────────────────────────────────────────────

function FormDetailDrawer({ form, onClose, onEdit, onShareClick, onSubmit }: { form: Form | null; onClose: () => void; onEdit: (f: Form) => void; onShareClick: (f: Form) => void; onSubmit?: (form: Form, vals: Record<string, string>) => void }) {
  const [tab, setTab] = useState<"overview" | "preview">("overview");
  const [previewVals, setPreviewVals] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!form) return null;

  const formUrl = `https://app.myaifrontdesk.com/forms/form-${form.id}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600px" style="border: none; border-radius: 8px;"></iframe>`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[680px] bg-white shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-wrap">
          <h2 className="text-base font-bold mr-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{form.name}</h2>
          <StatusBadge status={form.status} />
          <span className="text-xs ml-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>Last edited {formatFormDate(form.lastUpdated || form.createdAt)}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => onEdit(form)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Edit2 className="w-3 h-3" />Edit
            </button>
            <button
              onClick={() => { onShareClick(form); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
            >
              <Share2 className="w-3 h-3" />Share
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-5 px-6 border-b border-border">
          {(["overview", "preview"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 pt-2 px-1 text-xs font-medium transition-colors relative capitalize ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {t === "overview" ? "Overview" : "Preview"}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-px bg-primary rounded-t" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "overview" ? (
            <div className="px-6 py-5 space-y-5">
              {/* Block 1 — Description */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>DESCRIPTION</p>
                <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>{form.description}</p>
              </div>

              <div className="h-px bg-border" />

              {/* Block 2 — Form Fields */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>FORM FIELDS</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                  <FileText className="w-3.5 h-3.5" />
                  {form.fields.length}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Block 3 — Created By */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>CREATED BY</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    {getInitials(form.createdBy)}
                  </div>
                  <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>{form.createdBy}</span>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Block 4 — Created On */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>CREATED ON</p>
                <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>{form.createdAt}</p>
              </div>

              {form.status === "live" && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide"
                      style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                      LIVE LINK
                    </p>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-border rounded-lg">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono truncate flex-1" style={{ color: "#64748B" }}>
                        {formUrl}
                      </span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(formUrl); toast.success("Link copied to clipboard"); }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg border border-border shrink-0 transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Copy className="w-3 h-3" /> Copy link
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide"
                      style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                      EMBED CODE
                    </p>
                    <div className="bg-gray-50 border border-border rounded-lg p-3 space-y-3">
                      <code className="text-xs break-all leading-relaxed font-mono block"
                        style={{ color: "#64748B" }}>
                        {embedCode}
                      </code>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => { navigator.clipboard.writeText(embedCode); toast.success("Embed code copied"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-black/90 transition-colors"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <Copy className="w-3 h-3" /> Copy embed code
                        </button>
                        <button
                          disabled
                          title="Coming soon"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <Mail className="w-3.5 h-3.5" /> Email to developer (Coming soon)
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {form.status === "draft" && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide"
                      style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                      STATUS
                    </p>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-xs text-amber-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        This form is a draft — publish it to get a live link.
                      </span>
                      <button
                        onClick={() => toast.success("Form published!")}
                        className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-black/90 transition-colors shrink-0 ml-3"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Publish form
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Preview tab */
            <div className="px-6 py-5 space-y-5">
              <h3 className="text-base font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{form.name}</h3>
              <div className="space-y-4">
                {form.fields.map((field, idx) => {
                  const key = `drawer-${field.label}`;
                  const val = previewVals[key] || "";
                  return (
                    <div key={idx} className="space-y-1">
                      <label className="text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                        {field.label}{field.required && <span className="ml-1 text-red-400">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          value={val}
                          onChange={e => setPreviewVals(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={val}
                          onChange={e => setPreviewVals(prev => ({ ...prev, [key]: e.target.value }))}
                          className={SELECT_STYLE + " w-full"}
                          style={SELECT_INLINE}
                        >
                          <option value="">{field.placeholder || "Select…"}</option>
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={val}
                          onChange={e => setPreviewVals(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {submitted ? (
                <div className="w-full py-4 rounded-xl bg-green-50 border border-green-200 text-center">
                  <p className="text-sm font-semibold text-green-700" style={{ fontFamily: "DM Sans, sans-serif" }}>✓ Submitted!</p>
                  <p className="text-xs text-green-600 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {form.autoCreateClient ? "Client record created/updated." : "Submission recorded."}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (onSubmit) {
                      const labelledVals: Record<string, string> = {};
                      form.fields.forEach(f => {
                        const key = `submit-${f.label}`;
                        labelledVals[key] = previewVals[`drawer-${f.label}`] ?? "";
                      });
                      onSubmit(form, labelledVals);
                    }
                    setSubmitted(true);
                    setTimeout(() => { setSubmitted(false); setPreviewVals({}); }, 3000);
                  }}
                  className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-black/90 transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {form.autoCreateClient ? "Submit & Create Client" : "Submit Form"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function IntakeFlowDrawer({
  flow,
  forms,
  onClose,
  onEdit,
  onOpenPreview,
}: {
  flow: IntakeFlow | null;
  forms: Form[];
  onClose: () => void;
  onEdit: (fl: IntakeFlow) => void;
  onOpenPreview?: (fl: IntakeFlow) => void;
}) {
  if (!flow) return null;

  const flowUrl = `https://app.myaifrontdesk.com/flows/flow-${flow.id}`;
  const flowEmbedCode = `<iframe src="${flowUrl}" width="100%" height="700px" style="border: none; border-radius: 8px;"></iframe>`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[680px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-wrap">
          <h2 className="text-base font-bold mr-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
            {flow.name}
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            Intake Flow
          </span>
          <span className="text-xs ml-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
            Created {flow.createdAt}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onOpenPreview && (
              <button
                onClick={() => { onClose(); onOpenPreview(flow); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            )}
            <button
              onClick={() => { onClose(); onEdit(flow); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Block 1 — Forms in Flow count + step list combined */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" 
               style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
              FORMS IN FLOW
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium mb-3"
                 style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
              <FileText className="w-3.5 h-3.5" />
              {flow.steps.length}
            </div>

            {flow.steps.length === 0 ? (
              <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                No forms in this flow yet.
              </p>
            ) : (
              <div className="space-y-2">
                {flow.steps.map((step, idx) => {
                  const sf = forms.find(f => f.id === step.formId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-border rounded-lg"
                    >
                      <div
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#64748B" }}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className="text-sm flex-1"
                        style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                      >
                        {sf?.name ?? `Form #${step.formId}`}
                      </span>
                      {step.required && (
                        <span
                          className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-medium shrink-0"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Required
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* Welcome message */}
          {flow.showWelcomeStep !== false && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide"
                   style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                  WELCOME MESSAGE
                </p>
                <p className="text-sm italic"
                   style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  "{flow.welcomeMessage}"
                </p>
              </div>
              <div className="h-px bg-border" />
            </>
          )}

          {/* Thank you message */}
          {flow.showThankYouStep !== false && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide"
                   style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                  THANK YOU MESSAGE
                </p>
                <p className="text-sm italic"
                   style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  "{flow.thankYouMessage}"
                </p>
              </div>
              <div className="h-px bg-border" />
            </>
          )}

          {/* Created By */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide"
               style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
              CREATED BY
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold shrink-0"
                style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
              >
                {getInitials(flow.senderName)}
              </div>
              <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                {flow.senderName}
              </span>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Created On */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide"
               style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
              CREATED ON
            </p>
            <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
              {flow.createdAt}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Share Link */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide"
               style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
              SHARE LINK
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-border rounded-lg">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono truncate flex-1" style={{ color: "#64748B" }}>
                {flowUrl}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(flowUrl); toast.success("Link copied to clipboard"); }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg border border-border shrink-0 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Copy className="w-3 h-3" /> Copy link
              </button>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Embed Code */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide"
               style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
              EMBED CODE
            </p>
            <div className="bg-gray-50 border border-border rounded-lg p-3 space-y-3">
              <code className="text-xs break-all leading-relaxed font-mono block"
                    style={{ color: "#64748B" }}>
                {flowEmbedCode}
              </code>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { navigator.clipboard.writeText(flowEmbedCode); toast.success("Embed code copied"); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-black/90 transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Copy className="w-3 h-3" /> Copy embed code
                </button>
                <button
                  disabled
                  title="Coming soon"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Mail className="w-3.5 h-3.5" /> Email to developer (Coming soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WebForms() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = sessionStorage.getItem("clients");
    return saved ? JSON.parse(saved) : initialClients;
  });
  const { customFieldsClients } = useClientFields();

  useEffect(() => {
    sessionStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  const [showHelp, setShowHelp] = useState(false);
  const [mainTab, setMainTab] = useState<"submissions" | "forms">("submissions");
  const [drawerForm, setDrawerForm] = useState<Form | null>(null);
  const [drawerFlow, setDrawerFlow] = useState<IntakeFlow | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [forms, setForms] = useState<Form[]>(() => {
    const saved = sessionStorage.getItem("webForms");
    return saved ? JSON.parse(saved) : INITIAL_FORMS;
  });
  // Forms sub-tab
  const [formsSubTab, setFormsSubTab] = useState<"forms" | "flows">("forms");
  const [viewingClient, setViewingClient] = useState<{ clientId: string; formId: number; submissionDate: string } | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = sessionStorage.getItem("webFormSubmissions");
    return saved ? JSON.parse(saved) : DUMMY_SUBMISSIONS_SEED;
  });


  const [formSearch, setFormSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "standard" | "intake" | "meta-ads">("all");
  const [sortCol, setSortCol] = useState<"name" | "submissions" | "lastUpdated">("lastUpdated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Flows state
  const [flows, setFlows] = useState<IntakeFlow[]>(() => {
    const saved = sessionStorage.getItem("intakeFlows");
    return saved ? JSON.parse(saved) : INITIAL_FLOWS;
  });
  const [flowSearch, setFlowSearch] = useState("");
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [activeFlow, setActiveFlow] = useState<IntakeFlow | null>(null);
  const [expandedFlowId, setExpandedFlowId] = useState<number | null>(null);
  const [flowDropdownId, setFlowDropdownId] = useState<number | null>(null);

  // Create flow modal state
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowNameError, setNewFlowNameError] = useState(false);

  // Flow detail state
  const [editingFlowName, setEditingFlowName] = useState(false);
  const [flowNameDraft, setFlowNameDraft] = useState("");
  const [flowNameError, setFlowNameError] = useState(false);

  // Add form to flow state
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [addFormId, setAddFormId] = useState<number | null>(null);
  const [addRequired, setAddRequired] = useState(true);
  const [addNewTitle, setAddNewTitle] = useState("");
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [welcomeDraft, setWelcomeDraft] = useState("");
  const [editingThankYou, setEditingThankYou] = useState(false);
  const [thankYouDraft, setThankYouDraft] = useState("");

  // Drag state for flow steps
  const dragStepIndex = useRef<number | null>(null);

  // Restore active flow when returning from FormBuilder
  useEffect(() => {
    const state = location.state as { returnToTab?: string; returnToFlowId?: number } | null;
    if (state?.returnToTab === "flows" && state?.returnToFlowId) {
      setMainTab("forms");
      setFormsSubTab("flows");
      const flow = flows.find(fl => fl.id === state.returnToFlowId);
      if (flow) setActiveFlow(flow);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Persist flows and forms to sessionStorage so state survives navigation
  useEffect(() => {
    sessionStorage.setItem("intakeFlows", JSON.stringify(flows));
  }, [flows]);

  useEffect(() => {
    sessionStorage.setItem("webForms", JSON.stringify(forms));
  }, [forms]);

  useEffect(() => {
    sessionStorage.setItem("webFormSubmissions", JSON.stringify(submissions));
  }, [submissions]);

  // Reset search when switching sub-tabs
  useEffect(() => {
    if (formsSubTab === "forms") setFlowSearch("");
    if (formsSubTab === "flows") setFormSearch("");
  }, [formsSubTab]);

  const handleShareSend = ({
    formId,
    clients = [],
    literals = [],
    channel,
    kind,
  }: {
    formId: number;
    clients?: ShareClient[];
    literals?: ShareLiteralRecipient[];
    channel: ShareChannel;
    kind: ShareTargetKind;
  }) => {
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const clientRecords: Submission[] = clients.map((client, i) => ({
      id: Date.now() + i,
      clientId: client.id,
      formId,
      name: client.name,
      email: client.email,
      date: today,
      status: "sent",
      fields: {
        "Full Name": client.name,
        "Email": client.email,
        "Phone": client.phone,
      },
    }));

    const literalRecords: Submission[] = literals.map((rec, i) => ({
      id: Date.now() + 1000 + i,
      clientId: rec.id,
      formId,
      name: rec.value,
      email: channel === "email" ? rec.value : "",
      date: today,
      status: "sent",
      fields: {
        "Recipient": rec.value,
      },
    }));

    const newRecords = [...clientRecords, ...literalRecords];
    setSubmissions((prev) => [...newRecords, ...prev]);

    // Cross-write into the shared clientFormSubmissions store so the client's
    // Forms tab shows sent-form entries immediately.
    clients.forEach((client) => {
      appendClientSubmission({
        clientId: client.id,
        formId,
        sentAt: new Date().toISOString().split("T")[0],
        submittedAt: today,
        status: "pending",
        fields: {
          "Full Name": client.name,
          "Email": client.email,
          "Phone": client.phone,
        },
      });
    });

    if (kind === "form") {
      setForms((prevForms) =>
        prevForms.map((f) =>
          f.id === formId ? { ...f, submissions: f.submissions + clients.length } : f
        )
      );
    }
  };

  const stats = {
    submissions7d: 47,
    submissionsPrior7d: 31,
    activeForms: { total: 3, live: 3, draft: 1 },
    topPerformer: { name: "Newsletter Signup", total: 89 },
    submissionUsage: { current: 135, limit: 300, status: "On track" },
  };

  /**
   * handlePreviewSubmit — called when a real (non-preview-only) form submission fires.
   * 1. Collects submitted field values
   * 2. If form.autoCreateClient is true:
   *    a. Tries to find an existing client by email or phone
   *    b. Creates a new Client record if no match is found
   * 3. Appends a Submission record with the resolved clientId
   */
  const handlePreviewSubmit = (form: Form, fieldValues: Record<string, string>) => {
    const today = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

    // Resolve the submitter's key fields strictly from explicitly linked registry fields.
    // Form Elements carry no sourceFieldKey/module and must NOT drive client record creation.
    const getVal = (key: string) => {
      const field = form.fields.find(f => f.sourceFieldKey === key && f.module === "client");
      return field ? fieldValues[`submit-${field.label}`] ?? "" : "";
    };

    const submittedEmail = getVal("email");
    const submittedName = getVal("name");
    const submittedPhone = getVal("phone");

    let resolvedClientId = "";

    if (form.autoCreateClient) {
      // Try to find matching client by email
      const existing = clients.find(c =>
        (submittedEmail && c.email.toLowerCase() === submittedEmail.toLowerCase()) ||
        (submittedPhone && c.phone === submittedPhone.replace(/\D/g, ""))
      );

      if (existing) {
        resolvedClientId = existing.id;

        // Map submitted system/custom fields onto existing client
        const updated = { ...existing };
        let updatedAny = false;
        form.fields.forEach((f) => {
          const val = fieldValues[`submit-${f.label}`];
          if (!val || !f.sourceFieldKey) return;
          const key = f.sourceFieldKey;
          if (key === "email" && !updated.email) { updated.email = val; updatedAny = true; }
          else if (key === "phone" && !updated.phone) { updated.phone = val.replace(/\D/g, ""); updatedAny = true; }
          else if (key === "company") { (updated as any).companyName = val; updatedAny = true; }
          else if (key === "role") { (updated as any).jobPosition = val; updatedAny = true; }
          else if (key === "country" && !updated.country) { updated.country = val; updatedAny = true; }
          else if (key === "name" && !updated.name) { updated.name = val; updatedAny = true; }
          else if (!["processes", "email", "phone", "country", "name", "company", "role"].includes(key)) {
            if ((updated as any)[key] !== val) {
              (updated as any)[key] = val;
              updatedAny = true;
            }
          }

          // Also make sure it's in visibleFieldKeys if it's a client-module field
          if (f.module === "client") {
            const visible = (updated as any).visibleFieldKeys || [];
            if (!visible.includes(key)) {
              (updated as any).visibleFieldKeys = [...visible, key];
              updatedAny = true;
            }
          }
        });

        if (updatedAny) {
          setClients(prev => prev.map(c => c.id === existing.id ? updated : c));
        }
      } else {
        // Auto-create a new Client
        const newId = `CL-${String(Date.now()).slice(-6)}`;

        // Resolve process and country strictly from explicitly linked registry fields.
        // Label-matching fallbacks are intentionally removed to prevent Form Elements
        // (e.g. a Short Text labeled "Country") from accidentally routing data into
        // client/process records.
        const processField = form.fields.find(
          f => f.sourceFieldKey === "processes" && f.module === "client"
        );
        const submittedProcess = processField
          ? (fieldValues[`submit-${processField.label}`] ?? "").trim()
          : "";
        const processName = submittedProcess || form.autoCreateProcessId || "";
        const stageName = form.autoCreateStageId || "Initial Contact";

        const countryField = form.fields.find(
          f => f.sourceFieldKey === "country" && f.module === "client"
        );
        const resolvedCountry = countryField
          ? (fieldValues[`submit-${countryField.label}`] || "US")
          : "US";

        const newClient: Client = {
          id: newId,
          name: submittedName || submittedEmail || "New Contact",
          email: submittedEmail,
          phone: submittedPhone.replace(/\D/g, ""),
          country: resolvedCountry,
          countryCode: "+1",
          countryFlag: "🇺🇸",
          processes: processName ? [processName] : [],
          stage: processName ? `${processName}: ${stageName}` : stageName,
          lastContact: new Date().toISOString().split("T")[0],
          status: "Active",
        };

        const visibleKeys: string[] = [];

        // Map all submitted system and custom field values via sourceFieldKey
        // onto the persisted client record (company, role, patient_id, etc.)
        form.fields.forEach(f => {
          const val = fieldValues[`submit-${f.label}`];
          if (!val || !f.sourceFieldKey) return;
          const key = f.sourceFieldKey;

          if (f.module === "client") {
            visibleKeys.push(key);
          }

          if (["email", "phone", "processes", "country", "name"].includes(key)) return;
          if (key === "company") { (newClient as any).companyName = val; return; }
          if (key === "role") { (newClient as any).jobPosition = val; return; }
          (newClient as any)[key] = val;
        });

        (newClient as any).visibleFieldKeys = visibleKeys;

        setClients(prev => [newClient, ...prev]);
        resolvedClientId = newId;
        toast.success(`New client created: ${newClient.name}`);
      }
    }

    // Build the clean fields map (strip the "submit-" prefix used internally)
    const cleanFields: Record<string, string> = {};
    for (const [rawKey, val] of Object.entries(fieldValues)) {
      const label = rawKey.startsWith("submit-") ? rawKey.slice(7) : rawKey;
      cleanFields[label] = val;
    }

    // Build submission record for the WebForms submissions table
    const newSub: Submission = {
      id: Date.now(),
      clientId: resolvedClientId,
      formId: form.id,
      name: submittedName || submittedEmail || "Anonymous",
      email: submittedEmail,
      date: today,
      status: "completed",
      fields: cleanFields,
    };

    setSubmissions(prev => [newSub, ...prev]);
    setForms(prev => prev.map(f => f.id === form.id ? { ...f, submissions: f.submissions + 1 } : f));

    // Cross-write into the shared clientFormSubmissions store so the client's
    // Forms tab reflects this submission immediately.
    if (resolvedClientId) {
      appendClientSubmission({
        clientId: resolvedClientId,
        formId: form.id,
        sentAt: new Date().toISOString().split("T")[0],
        submittedAt: today,
        status: "completed",
        fields: cleanFields,
      });
    }

    toast.success("Form submitted successfully!");
  };


  // Forms table filtered+sorted
  const displayForms = forms
    .filter(f =>
      f.name.toLowerCase().includes(formSearch.toLowerCase()) &&
      (typeFilter === "all" || f.formType === typeFilter)
    )
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (sortCol === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortCol === "submissions") {
        aVal = a.submissions;
        bVal = b.submissions;
      } else {
        const parseDate = (dStr: string | undefined) => {
          if (!dStr) return 0;
          const t = Date.parse(dStr);
          return isNaN(t) ? 0 : t;
        };
        aVal = parseDate(a.lastUpdated || a.createdAt);
        bVal = parseDate(b.lastUpdated || b.createdAt);
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // Temporary console check to verify sorted forms order
  const handleSortCol = (col: "name" | "submissions" | "lastUpdated") => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const handlePreviewClick = (form: Form) => {
    setDrawerForm(form);
    setOpenDropdownId(null);
  };

  const handleDelete = (formId: number) => {
    const usedInFlows = flows.filter(fl => fl.steps.some(s => s.formId === formId));
    if (usedInFlows.length > 0) {
      const confirmed = window.confirm(
        `This form is used in ${usedInFlows.length} intake flow(s). Deleting it will remove it from those flows too. Continue?`
      );
      if (!confirmed) return;
      setFlows(flows.map(fl => ({ ...fl, steps: fl.steps.filter(s => s.formId !== formId) })));
    }
    setForms(forms.filter(f => f.id !== formId));
    setOpenDropdownId(null);
    toast.success("Form deleted");
  };

  const handleToggle = (formId: number) => {
    const form = forms.find(f => f.id === formId);
    setForms(forms.map(f => f.id === formId ? { ...f, enabled: !f.enabled } : f));
    toast.success(`${form?.name} ${form?.enabled ? "disabled" : "enabled"}`);
  };

  const handleEdit = (form: Form) => {
    navigate("/web-forms/builder", { state: { form } });
  };

  // Drag handlers for flow steps
  const handleStepDragStart = (idx: number) => {
    dragStepIndex.current = idx;
  };

  const handleStepDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragStepIndex.current === null || dragStepIndex.current === idx) return;
  };

  const handleStepDrop = (idx: number) => {
    if (dragStepIndex.current === null || !activeFlow) return;
    const from = dragStepIndex.current;
    if (from === idx) return;
    const newSteps = [...activeFlow.steps];
    const [moved] = newSteps.splice(from, 1);
    newSteps.splice(idx, 0, moved);
    setActiveFlow({ ...activeFlow, steps: newSteps });
    dragStepIndex.current = null;
  };

  // Create flow handler
  const handleCreateFlow = () => {
    if (!newFlowName.trim()) { setNewFlowNameError(true); return; }
    const newFlow: IntakeFlow = {
      id: Date.now(),
      name: newFlowName.trim(),
      groups: [],
      steps: [],
      welcomeMessage: "Welcome! Please complete the following forms at your convenience.",
      thankYouMessage: "Thank you for submitting! We'll be in touch shortly.",
      senderName: "Admin User",
      hasActiveClients: false,
      createdAt: "Jun 16, 2026",
    };
    setFlows(prev => [...prev, newFlow]);
    setCreateFlowOpen(false);
    setNewFlowName("");
    setNewFlowNameError(false);
    setActiveFlow(newFlow);
  };

  // Save flow name
  const handleFlowNameSave = () => {
    if (!activeFlow) return;
    if (!flowNameDraft.trim()) { setFlowNameError(true); return; }
    setActiveFlow({ ...activeFlow, name: flowNameDraft.trim() });
    setFlows(flows.map(fl => fl.id === activeFlow.id ? { ...fl, name: flowNameDraft.trim() } : fl));
    setEditingFlowName(false);
    setFlowNameError(false);
  };

  // Add form to flow
  const doAddFormToFlow = () => {
    if (!activeFlow) return;
    if (addMode === "existing" && addFormId !== null) {
      const updated = { ...activeFlow, steps: [...activeFlow.steps, { formId: addFormId, required: addRequired }] };
      setActiveFlow(updated);
      setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
      toast.success("Form added to flow");
      setAddOpen(false);
      setAddFormId(null);
      setAddRequired(true);
      setAddConfirmOpen(false);
    } else if (addMode === "new" && addNewTitle.trim()) {
      const newForm: Form = {
        id: Date.now(),
        name: addNewTitle.trim(),
        formType: "standard",
        createdBy: "Admin User",
        fieldCount: 0,
        fields: [],
        status: "draft",
        submissions: 0,
        enabled: true,
        description: "",
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdated: new Date().toISOString(),
      };
      setForms(prev => [...prev, newForm]);
      const updated = { ...activeFlow, steps: [...activeFlow.steps, { formId: newForm.id, required: addRequired }] };
      setActiveFlow(updated);
      setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
      setAddOpen(false);
      setAddNewTitle("");
      setAddRequired(true);
      setAddConfirmOpen(false);
      navigate("/web-forms/builder", { state: { form: newForm, returnTo: { tab: "flows", flowId: activeFlow.id } } });
    }
  };

  const handleAddFormClick = () => {
    if (activeFlow?.hasActiveClients) {
      setAddConfirmOpen(true);
    } else {
      doAddFormToFlow();
    }
  };


  // Preview: build ordered list of screens based on which steps are enabled
  const previewForms = activeFlow ? activeFlow.steps.map(s => forms.find(f => f.id === s.formId)).filter(Boolean) as Form[] : [];
  const previewScreens: { type: "welcome" | "form" | "thankYou"; formIndex?: number }[] = [];
  if (activeFlow && activeFlow.showWelcomeStep !== false) previewScreens.push({ type: "welcome" });
  previewForms.forEach((_, i) => previewScreens.push({ type: "form", formIndex: i }));
  if (activeFlow && activeFlow.showThankYouStep !== false) previewScreens.push({ type: "thankYou" });
  const currentScreen = previewScreens[previewStep] ?? null;
  const isThankYouStep = currentScreen?.type === "thankYou";
  const isWelcomeScreen = currentScreen?.type === "welcome";
  const currentPreviewForm = currentScreen?.type === "form" ? previewForms[currentScreen.formIndex!] : null;
  const currentStepConfig = currentScreen?.type === "form" ? activeFlow?.steps[currentScreen.formIndex!] : null;
  const totalPreviewSteps = previewForms.length + 1; // kept for legacy disabled check

  const isPreviewStepValid = () => true;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
              Web Forms
            </h1>
            <p className="text-base" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
              Collect leads from your website and turn every submission into a client automatically
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Web Forms Works" />
            <Button
              variant="primary"
              onClick={() => navigate("/web-forms/new")}
              className="flex items-center gap-2 bg-black hover:bg-black/90 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              New form
            </Button>
          </div>
        </div>

        {/* Stats Cards — thin capsule style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-2.5 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>SUBMISSIONS — 7D</span>
            <span className="text-xl font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{stats.submissions7d}</span>
            <span className="text-xs shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>vs prior 7d: {stats.submissionsPrior7d}</span>
          </div>
          <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-2.5 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>ACTIVE FORMS</span>
            <span className="text-xl font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{stats.activeForms.total}</span>
            <span className="text-xs shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{stats.activeForms.live} live · {stats.activeForms.draft} draft</span>
          </div>
          <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-2.5 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>TOP PERFORMER</span>
            <span className="text-sm font-bold flex-1 text-center truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{stats.topPerformer.name}</span>
            <span className="text-xs shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{stats.topPerformer.total} submissions</span>
          </div>
          <div className="bg-white border border-border shadow-sm rounded-2xl px-5 py-2.5 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>USAGE</span>
            <span className="text-xl font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{stats.submissionUsage.current}<span className="text-base font-normal text-muted-foreground">/{stats.submissionUsage.limit}</span></span>
            <span className="text-xs shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{stats.submissionUsage.status}</span>
          </div>
        </div>

        {/* Top-level Tabs */}
        <div className="border-b border-border">
          <div className="flex items-center gap-8">
            {(["submissions", "forms"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`pb-3 px-1 text-sm font-medium transition-colors relative capitalize ${mainTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {tab}
                {mainTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {mainTab === "submissions" && (
          <SubmissionsTab
            submissions={submissions}
            forms={forms}
            onViewSubmission={sub => setViewingClient({ clientId: sub.clientId, formId: sub.formId, submissionDate: sub.date })}
          />
        )}

        {mainTab === "forms" && (
          <>
            {/* Secondary sub-tab row */}
            <div className="inline-flex border border-border rounded-lg overflow-hidden mb-2">
              {(["forms", "flows"] as const).map(sub => (
                <button
                  key={sub}
                  onClick={() => setFormsSubTab(sub)}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${formsSubTab === sub ? "bg-black text-white" : "bg-white text-[#64748B] hover:bg-gray-50"
                    }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {sub === "forms" ? "All Forms" : "Intake Flows"}
                </button>
              ))}
            </div>

            {/* ── Forms sub-tab ── */}
            {formsSubTab === "forms" && (
              <div className="space-y-4">


                {/* Filter bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search forms…"
                      value={formSearch}
                      onChange={e => setFormSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                  {/* Type segmented control */}
                  <div className="inline-flex border border-border rounded-lg overflow-hidden shrink-0">
                    {(["all", "standard", "intake", "meta-ads"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${typeFilter === t ? "bg-black text-white" : "bg-white text-[#64748B] hover:bg-gray-50"
                          }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {t === "all" ? "All Types" : t === "standard" ? "Standard" : t === "intake" ? "Intake" : "Meta Ads"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forms table */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-2xs overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <button className="flex items-center gap-1 hover:text-blue-300 transition-colors" onClick={() => handleSortCol("name")}>
                            Title {sortCol === "name" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <button className="flex items-center gap-1 hover:text-blue-300 transition-colors" onClick={() => handleSortCol("submissions")}>
                            Submissions {sortCol === "submissions" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Created By</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <button className="flex items-center gap-1 hover:text-blue-300 transition-colors" onClick={() => handleSortCol("lastUpdated")}>
                            Last Updated {sortCol === "lastUpdated" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>Enabled</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right" style={{ fontFamily: "Outfit, sans-serif" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayForms.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                            No forms found
                          </td>
                        </tr>
                      ) : displayForms.map((form, i) => (
                        <tr
                          key={form.id}
                          onClick={() => handlePreviewClick(form)}
                          className={`cursor-pointer transition-colors hover:bg-gray-50/60 ${i < displayForms.length - 1 ? "border-b border-border" : ""}`}
                        >
                          {/* Name */}
                          <td className="px-4 py-3.5">
                            <span
                              className="text-sm font-medium cursor-pointer hover:underline"
                              style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                              onClick={e => { e.stopPropagation(); handlePreviewClick(form); }}
                            >
                              {form.name}
                            </span>
                          </td>
                          {/* Type */}
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            {form.formType === "intake" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Intake
                              </span>
                            ) : form.formType === "meta-ads" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
                                  <path d="M12 6.073c0-3.315-2.686-6-6-6S0 2.758 0 6.073c0 2.995 2.194 5.477 5.063 5.927V7.77H3.54V6.073h1.523V4.734c0-1.503.896-2.334 2.267-2.334.656 0 1.343.117 1.343.117v1.476h-.756c-.745 0-.977.462-.977.937v1.143h1.664l-.266 1.697H6.94v4.23C9.806 11.55 12 9.068 12 6.073z" />
                                </svg>
                                Meta Ads
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#64748B]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                Standard
                              </span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <StatusBadge status={form.status} />
                          </td>
                          {/* Submissions */}
                          <td className="px-4 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                            {form.submissions}
                          </td>
                          {/* Created By */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center font-medium shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                                {getInitials(form.createdBy)}
                              </div>
                              <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>{form.createdBy}</span>
                            </div>
                          </td>
                          {/* Last Updated */}
                          <td className="px-4 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                            {formatFormDate(form.lastUpdated || form.createdAt)}
                          </td>
                          {/* Enabled toggle */}
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <label className="flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                              <div className="relative">
                                <input type="checkbox" checked={form.enabled} onChange={() => handleToggle(form.id)} className="sr-only peer" />
                                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-4 after:transition-all peer-checked:bg-primary" />
                              </div>
                            </label>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="relative">
                              <button
                                onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === form.id ? null : form.id); }}
                                className="p-1.5 hover:bg-muted/20 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" style={{ color: "#64748B" }} />
                              </button>
                              {openDropdownId === form.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-20">
                                    <button onClick={() => { setOpenDropdownId(null); handleEdit(form); }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-3" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                                      <Edit2 className="w-4 h-4 text-muted-foreground" />Edit
                                    </button>
                                    <button onClick={() => { setOpenDropdownId(null); setShareTarget({ id: form.id, name: form.name, kind: "form", status: form.status }); }} className="w-full px-4 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-3" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                                      <Share2 className="w-4 h-4 text-muted-foreground" />Share
                                    </button>
                                    <button onClick={() => { setOpenDropdownId(null); navigate(`/web-forms/test/${form.id}`); }} className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-3" style={{ fontFamily: "Outfit, sans-serif", color: "#3B82F6" }}>
                                      <FlaskConical className="w-4 h-4" style={{ color: "#3B82F6" }} />Test
                                    </button>
                                    <button onClick={() => handleDelete(form.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3" style={{ fontFamily: "Outfit, sans-serif", color: "#EF4444" }}>
                                      <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Intake Flows sub-tab ── */}
            {formsSubTab === "flows" && (
              <div className="space-y-4">
                {/* Flow detail view */}
                {activeFlow !== null ? (
                  <div className="space-y-6">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => { setActiveFlow(null); setEditingFlowName(false); setAddOpen(false); }}
                          className="flex items-center gap-1.5 text-sm shrink-0 hover:text-foreground transition-colors"
                          style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Intake Flows
                        </button>
                        <span style={{ color: "#94A3B8" }}>·</span>
                        {editingFlowName ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex-1 min-w-0">
                              <input
                                autoFocus
                                value={flowNameDraft}
                                onChange={e => { setFlowNameDraft(e.target.value); setFlowNameError(false); }}
                                onBlur={handleFlowNameSave}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleFlowNameSave();
                                  if (e.key === "Escape") { setEditingFlowName(false); setFlowNameError(false); }
                                }}
                                className="px-2 py-1 border border-border rounded-lg text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                                style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                              />
                              {flowNameError && <p className="text-xs text-red-500 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Flow name can't be empty</p>}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingFlowName(true); setFlowNameDraft(activeFlow.name); setFlowNameError(false); }}
                            className="flex items-center gap-2 group hover:text-[#020817] transition-colors"
                          >
                            <h2 className="text-lg font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{activeFlow.name}</h2>
                            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#64748B" }} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => { setPreviewOpen(true); setPreviewStep(0); setPreviewValues({}); }}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                    </div>

                    {/* Welcome Step - always first, editable */}
                    {activeFlow.showWelcomeStep === false ? (
                      <div className="bg-gray-50 rounded-xl border border-dashed border-border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">W</div>
                          <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>Welcome Message</span>
                          <span className="text-xs text-muted-foreground italic">(removed)</span>
                        </div>
                        <button
                          onClick={() => {
                            const updated = { ...activeFlow, showWelcomeStep: true };
                            setActiveFlow(updated);
                            setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                          }}
                          className="text-xs font-medium hover:underline"
                          style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                        >
                          Restore
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">W</div>
                            <span className="text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>Welcome Message</span>
                            <span className="text-xs text-muted-foreground">(always first)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setEditingWelcome(true); setWelcomeDraft(activeFlow.welcomeMessage); }}
                              className="text-xs text-primary hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const welcomeIndex = previewScreens.findIndex(s => s.type === "welcome");
                                setPreviewStep(welcomeIndex >= 0 ? welcomeIndex : 0);
                                setPreviewValues({});
                                setPreviewOpen(true);
                              }}
                              className="text-xs font-medium hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...activeFlow, showWelcomeStep: false };
                                setActiveFlow(updated);
                                setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                              }}
                              className="text-xs font-medium hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif", color: "#EF4444" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {editingWelcome ? (
                          <textarea
                            autoFocus
                            value={welcomeDraft}
                            onChange={e => setWelcomeDraft(e.target.value)}
                            onBlur={() => {
                              const updated = { ...activeFlow, welcomeMessage: welcomeDraft };
                              setActiveFlow(updated);
                              setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                              setEditingWelcome(false);
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic" style={{ fontFamily: "Outfit, sans-serif" }}>
                            "{activeFlow.welcomeMessage}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Order of Forms */}
                    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>Order of Forms</h3>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>{activeFlow.steps.length}</span>
                      </div>

                      {activeFlow.steps.length === 0 ? (
                        <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>This flow has no forms yet.</p>
                      ) : (
                        <div className="space-y-0">
                          {activeFlow.steps.map((step, idx) => {
                            const stepForm = forms.find(f => f.id === step.formId);
                            return (
                              <div key={`${step.formId}-${idx}`} className="flex gap-3">
                                {/* Left connector line */}
                                <div className="flex flex-col items-center w-6 shrink-0">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0 mt-3" style={{ fontFamily: "DM Sans, sans-serif", color: "#64748B" }}>
                                    {idx + 1}
                                  </div>
                                  {idx < activeFlow.steps.length - 1 && (
                                    <div className="w-px flex-1 bg-gray-200 mt-1 mb-1" />
                                  )}
                                </div>
                                {/* Step card */}
                                <div
                                  className="flex-1 flex items-center justify-between gap-3 py-3 px-4 mb-2 bg-gray-50 rounded-xl border border-border"
                                  draggable
                                  onDragStart={() => handleStepDragStart(idx)}
                                  onDragOver={e => handleStepDragOver(e, idx)}
                                  onDrop={() => handleStepDrop(idx)}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <GripVertical className="w-4 h-4 shrink-0 cursor-grab" style={{ color: "#94A3B8" }} />
                                    <div>
                                      <p className="text-xs font-medium mb-0.5" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                                        {ordinalSuffix(idx + 1)} form
                                      </p>
                                      <p
                                        className="text-sm font-semibold cursor-pointer hover:underline"
                                        style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                                        onClick={() => stepForm && setDrawerForm(stepForm)}
                                      >
                                        {stepForm?.name ?? `Form #${step.formId}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={step.required}
                                        onChange={e => {
                                          const newSteps = activeFlow.steps.map((s, i) => i === idx ? { ...s, required: e.target.checked } : s);
                                          const updated = { ...activeFlow, steps: newSteps };
                                          setActiveFlow(updated);
                                          setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <span className="text-xs" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Required</span>
                                    </label>
                                    {stepForm && (
                                      <button
                                        onClick={() => setDrawerForm(stepForm)}
                                        className="text-xs font-medium hover:underline"
                                        style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                                      >
                                        View
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        const newSteps = activeFlow.steps.filter((_, i) => i !== idx);
                                        const updated = { ...activeFlow, steps: newSteps };
                                        setActiveFlow(updated);
                                        setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                                      }}
                                      className="text-xs font-medium hover:underline"
                                      style={{ fontFamily: "Outfit, sans-serif", color: "#EF4444" }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add a form control */}
                      {!addOpen ? (
                        <button
                          onClick={() => { setAddOpen(true); setAddMode("existing"); setAddFormId(null); setAddNewTitle(""); setAddRequired(true); }}
                          className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors"
                          style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                        >
                          <Plus className="w-4 h-4" />
                          Add a Form to this Intake Flow
                        </button>
                      ) : (
                        <div className="border border-border rounded-xl p-4 space-y-3 bg-gray-50">
                          {addMode === "existing" ? (
                            <>
                              <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Select an existing form</p>
                              <select
                                value={addFormId ?? ""}
                                onChange={e => setAddFormId(e.target.value ? Number(e.target.value) : null)}
                                className={SELECT_STYLE + " w-full"}
                                style={SELECT_INLINE}
                              >
                                <option value="">Choose a form…</option>
                                {forms.filter(f => !activeFlow.steps.some(s => s.formId === f.id)).map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={addRequired} onChange={e => setAddRequired(e.target.checked)} className="rounded border-gray-300" />
                                <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>Set form as required</span>
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  disabled={addFormId === null || addConfirmOpen}
                                  onClick={handleAddFormClick}
                                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                >
                                  Add
                                </button>
                                <button onClick={() => setAddOpen(false)} className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Cancel</button>
                              </div>
                              <button onClick={() => setAddMode("new")} className="text-xs underline" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                                Or create a new form
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Create a new form</p>
                              <input
                                type="text"
                                placeholder="New form title"
                                value={addNewTitle}
                                onChange={e => setAddNewTitle(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              />
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={addRequired} onChange={e => setAddRequired(e.target.checked)} className="rounded border-gray-300" />
                                <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>Set form as required</span>
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  disabled={!addNewTitle.trim() || addConfirmOpen}
                                  onClick={handleAddFormClick}
                                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  style={{ fontFamily: "DM Sans, sans-serif" }}
                                >
                                  Add
                                </button>
                                <button onClick={() => setAddOpen(false)} className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Cancel</button>
                              </div>
                              <button onClick={() => setAddMode("existing")} className="text-xs underline" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                                Or use an existing form
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Thank You Step - always last, editable */}
                    {activeFlow.showThankYouStep === false ? (
                      <div className="bg-gray-50 rounded-xl border border-dashed border-border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">T</div>
                          <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>Thank You Message</span>
                          <span className="text-xs text-muted-foreground italic">(removed)</span>
                        </div>
                        <button
                          onClick={() => {
                            const updated = { ...activeFlow, showThankYouStep: true };
                            setActiveFlow(updated);
                            setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                          }}
                          className="text-xs font-medium hover:underline"
                          style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                        >
                          Restore
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">T</div>
                            <span className="text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>Thank You Message</span>
                            <span className="text-xs text-muted-foreground">(always last)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setEditingThankYou(true); setThankYouDraft(activeFlow.thankYouMessage); }}
                              className="text-xs text-primary hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const thankYouIndex = previewScreens.findIndex(s => s.type === "thankYou");
                                const idx = thankYouIndex >= 0 ? thankYouIndex : Math.max(0, previewScreens.length - 1);
                                setPreviewStep(idx);
                                setPreviewValues({});
                                setPreviewOpen(true);
                              }}
                              className="text-xs font-medium hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...activeFlow, showThankYouStep: false };
                                setActiveFlow(updated);
                                setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                              }}
                              className="text-xs font-medium hover:underline"
                              style={{ fontFamily: "Outfit, sans-serif", color: "#EF4444" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {editingThankYou ? (
                          <textarea
                            autoFocus
                            value={thankYouDraft}
                            onChange={e => setThankYouDraft(e.target.value)}
                            onBlur={() => {
                              const updated = { ...activeFlow, thankYouMessage: thankYouDraft };
                              setActiveFlow(updated);
                              setFlows(flows.map(fl => fl.id === activeFlow.id ? updated : fl));
                              setEditingThankYou(false);
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic" style={{ fontFamily: "Outfit, sans-serif" }}>
                            "{activeFlow.thankYouMessage}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Add confirmation modal */}
                    {addConfirmOpen && (
                      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4">
                          <h3 className="text-base font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>Add New Form to Intake Flow</h3>
                          <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                            Clients who have already started or completed this flow won't automatically be prompted for the new form. You can send a completion request separately after adding.
                          </p>
                          <div className="flex gap-3 justify-end">
                            <button onClick={() => setAddConfirmOpen(false)} className="px-4 py-2 border border-border rounded-lg text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Cancel</button>
                            <button
                              onClick={() => { setAddConfirmOpen(false); doAddFormToFlow(); }}
                              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              Add Form to Intake Flow
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Flows list view ── */
                  <div className="space-y-4">
                    {/* Sub-header */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search intake flows…"
                          value={flowSearch}
                          onChange={e => setFlowSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                      </div>
                      <button
                        onClick={() => setCreateFlowOpen(true)}
                        className="flex items-center gap-2 bg-black text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-black/90 transition-colors shrink-0"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        <Plus className="w-4 h-4" />
                        Create intake flow
                      </button>
                    </div>

                    {/* Flows table or empty state */}
                    {flows.filter(fl => fl.name.toLowerCase().includes(flowSearch.toLowerCase())).length === 0 ? (
                      <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center space-y-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                          No intake flows yet — create one to guide new contacts through a sequence of forms automatically
                        </p>
                        <button
                          onClick={() => setCreateFlowOpen(true)}
                          className="inline-flex items-center gap-2 bg-black text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-black/90 transition-colors"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          <Plus className="w-4 h-4" />
                          Create intake flow
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-gray-50">
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Name</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Status</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Submissions</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Created By</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Last Updated</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>Enabled</th>
                              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                                style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {flows
                              .filter(fl => fl.name.toLowerCase().includes(flowSearch.toLowerCase()))
                              .map((flow, i, arr) => (
                                <tr
                                  key={flow.id}
                                  onClick={() => setDrawerFlow(flow)}
                                  className={`cursor-pointer transition-colors hover:bg-gray-50/60 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                                >
                                  {/* Name */}
                                  <td className="px-5 py-3.5">
                                    <button
                                      onClick={e => { e.stopPropagation(); setDrawerFlow(flow); }}
                                      className="text-sm font-medium hover:underline text-left"
                                      style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
                                    >
                                      {flow.name}
                                    </button>
                                  </td>

                                  {/* Status — flows don't have live/draft so show "Active" badge always */}
                                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                      Active
                                    </span>
                                  </td>

                                  {/* Submissions — sum of all forms in this flow */}
                                  <td className="px-5 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                                    onClick={e => e.stopPropagation()}>
                                    {flow.steps.reduce((sum, step) => {
                                      const f = forms.find(f => f.id === step.formId);
                                      return sum + (f?.submissions ?? 0);
                                    }, 0)}
                                  </td>

                                  {/* Created By */}
                                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center font-medium shrink-0"
                                        style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
                                      >
                                        {getInitials(flow.senderName)}
                                      </div>
                                      <span className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                                        {flow.senderName}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Last Updated */}
                                  <td className="px-5 py-3.5 text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}
                                    onClick={e => e.stopPropagation()}>
                                    {flow.createdAt}
                                  </td>

                                  {/* Enabled toggle */}
                                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                    <label className="flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={flow.enabled ?? true}
                                          onChange={() => {
                                            const updated = flows.map(fl =>
                                              fl.id === flow.id ? { ...fl, enabled: !(fl.enabled ?? true) } : fl
                                            );
                                            setFlows(updated);
                                            toast.success(`${flow.name} ${(flow.enabled ?? true) ? "disabled" : "enabled"}`);
                                          }}
                                          className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-4 after:transition-all peer-checked:bg-primary" />
                                      </div>
                                    </label>
                                  </td>

                                  {/* Actions dropdown */}
                                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                    <div className="relative flex justify-end">
                                      <button
                                        onClick={e => { e.stopPropagation(); setFlowDropdownId(flowDropdownId === flow.id ? null : flow.id); }}
                                        className="p-1.5 hover:bg-muted/20 rounded-lg transition-colors"
                                      >
                                        <MoreVertical className="w-4 h-4" style={{ color: "#64748B" }} />
                                      </button>
                                      {flowDropdownId === flow.id && (
                                        <>
                                          <div className="fixed inset-0 z-10" onClick={() => setFlowDropdownId(null)} />
                                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-border rounded-lg shadow-lg py-1 z-20">
                                            <button
                                              onClick={() => { setFlowDropdownId(null); setActiveFlow(flow); }}
                                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-3"
                                              style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                                            >
                                              <Edit2 className="w-4 h-4 text-muted-foreground" />Edit
                                            </button>
                                            <button
                                              onClick={() => {
                                                setFlowDropdownId(null);
                                                setShareTarget({ id: flow.id, name: flow.name, kind: "flow" });
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-3"
                                              style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                                            >
                                              <Share2 className="w-4 h-4 text-muted-foreground" />Share
                                            </button>
                                            <button
                                              onClick={() => {
                                                const dup: IntakeFlow = { ...flow, id: Date.now(), name: flow.name + " (Copy)", createdAt: "Jun 16, 2026" };
                                                setFlows(prev => [...prev, dup]);
                                                setFlowDropdownId(null);
                                                toast.success("Flow duplicated");
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/20 flex items-center gap-3"
                                              style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
                                            >
                                              <Copy className="w-4 h-4 text-muted-foreground" />Duplicate
                                            </button>
                                            <button
                                              onClick={() => {
                                                setFlows(flows.filter(fl => fl.id !== flow.id));
                                                setFlowDropdownId(null);
                                                toast.success("Flow deleted");
                                              }}
                                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3"
                                              style={{ fontFamily: "Outfit, sans-serif", color: "#EF4444" }}
                                            >
                                              <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />Delete
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Flow Modal */}
      {createFlowOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>Create Intake Flow</h3>
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newFlowName}
                onChange={e => { setNewFlowName(e.target.value); setNewFlowNameError(false); }}
                placeholder="e.g. New Patient Onboarding"
                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              {newFlowNameError && <p className="text-xs text-red-500 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Give this flow a name</p>}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => { setCreateFlowOpen(false); setNewFlowName(""); setNewFlowNameError(false); }}
                className="px-4 py-2 border border-border rounded-lg text-sm"
                style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFlow}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 transition-colors"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form detail drawer */}
      <FormDetailDrawer
        form={drawerForm}
        onClose={() => setDrawerForm(null)}
        onEdit={f => { setDrawerForm(null); handleEdit(f); }}
        onShareClick={f => setShareTarget({ id: f.id, name: f.name, kind: "form", status: f.status })}
        onSubmit={handlePreviewSubmit}
      />


      {/* Share form drawer */}
      <ShareFormDrawer
        target={shareTarget}
        onClose={() => setShareTarget(null)}
        onSend={handleShareSend}
      />

      {/* Intake flow detail drawer */}
      <IntakeFlowDrawer
        flow={drawerFlow}
        forms={forms}
        onClose={() => setDrawerFlow(null)}
        onEdit={fl => { setDrawerFlow(null); setActiveFlow(fl); }}
        onOpenPreview={fl => { setDrawerFlow(null); setActiveFlow(fl); setPreviewOpen(true); setPreviewStep(0); }}
      />

      {viewingClient && (
        <ClientProfile
          clientIdProp={viewingClient.clientId}
          onCloseOverride={() => setViewingClient(null)}
          initialOpenState={{
            openFormsTab: true,
            formId: viewingClient.formId,
            submissionDate: viewingClient.submissionDate,
          }}
        />
      )}

      {/* Preview overlay */}
      {previewOpen && activeFlow && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <button
              disabled={previewStep === 0}
              onClick={() => setPreviewStep(s => Math.max(0, s - 1))}
              className="flex items-center gap-1.5 text-sm disabled:opacity-40 hover:text-foreground transition-colors"
              style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <p className="text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
              {isWelcomeScreen ? "Welcome" : isThankYouStep ? "Thank You" : currentScreen?.type === "form" ? `Step ${previewStep + 1 - (activeFlow?.showWelcomeStep !== false ? 1 : 0)} of ${previewForms.length}` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={previewScreens.length === 0}
                onClick={() => {
                  if (previewStep >= previewScreens.length - 1) {
                    setPreviewOpen(false);
                  } else {
                    setPreviewStep(s => s + 1);
                  }
                }}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {previewStep >= previewScreens.length - 1 ? "Close Preview" : "Next"}
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="flex items-center gap-1.5 text-sm hover:text-foreground transition-colors"
                style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
              >
                Close Preview
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto flex items-start justify-center px-6 py-10">
            <div className="w-full max-w-xl">
              {isWelcomeScreen ? (
                /* Welcome screen */
                <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5 text-center">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                    Welcome [Client Name],
                  </h2>
                  {editingWelcome ? (
                    <textarea
                      autoFocus
                      value={welcomeDraft}
                      onChange={e => setWelcomeDraft(e.target.value)}
                      onBlur={() => {
                        setActiveFlow({ ...activeFlow, welcomeMessage: welcomeDraft });
                        setFlows(flows.map(fl => fl.id === activeFlow.id ? { ...fl, welcomeMessage: welcomeDraft } : fl));
                        setEditingWelcome(false);
                      }}
                      rows={4}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  ) : (
                    <div className="group relative">
                      <p className="text-base" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                        {activeFlow.welcomeMessage}
                      </p>
                      <button
                        onClick={() => { setEditingWelcome(true); setWelcomeDraft(activeFlow.welcomeMessage); }}
                        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm italic" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                    — {activeFlow.senderName}
                  </p>
                  {previewForms.length === 0 && (
                    <p className="text-xs" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                      Add a form to preview it here
                    </p>
                  )}
                </div>
              ) : isThankYouStep ? (
                /* Thank You screen */
                <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                    All Done!
                  </h2>
                  {editingThankYou ? (
                    <textarea
                      autoFocus
                      value={thankYouDraft}
                      onChange={e => setThankYouDraft(e.target.value)}
                      onBlur={() => {
                        const updated = { ...activeFlow, thankYouMessage: thankYouDraft };
                        setActiveFlow(updated);
                        setFlows(flows.map(fl => fl.id === activeFlow!.id ? updated : fl));
                        setEditingThankYou(false);
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  ) : (
                    <div className="group relative">
                      <p className="text-base" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                        {activeFlow.thankYouMessage}
                      </p>
                      <button
                        onClick={() => { setEditingThankYou(true); setThankYouDraft(activeFlow.thankYouMessage); }}
                        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
                      </button>
                    </div>
                  )}
                </div>
              ) : currentPreviewForm ? (
                /* Form step */
                <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
                  <h2 className="text-xl font-bold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                    {currentPreviewForm.name}
                  </h2>
                  <div className="space-y-4">
                    {currentPreviewForm.fields.map((field, idx) => {
                      const key = `${previewStep}-${field.label}`;
                      const val = previewValues[key] || "";
                      return (
                        <div key={idx} className="space-y-1">
                          <label className="text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                            {field.label}
                            {field.required && <span className="ml-1 text-red-400">*</span>}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              value={val}
                              onChange={e => setPreviewValues(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                          ) : field.type === "select" ? (
                            <select
                              value={val}
                              onChange={e => setPreviewValues(prev => ({ ...prev, [key]: e.target.value }))}
                              className={SELECT_STYLE + " w-full"}
                              style={SELECT_INLINE}
                            >
                              <option value="">{field.placeholder || "Select…"}</option>
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={val}
                              onChange={e => setPreviewValues(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

        </div>
      )}

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Web Forms Works"
        summary="Web Forms are embeddable forms you can drop on any page. Every submission can automatically create a client and enroll them in a process."
        bullets={[
          "Start from a template or build a form from scratch",
          "Turn on 'Auto-create client' to skip manual data entry",
          "Track submissions and which ones became clients",
          "Test a form end-to-end before publishing (via the test harness)",
        ]}
        guideUrl="/guide/web-forms"
      />
    </div>
  );
}
