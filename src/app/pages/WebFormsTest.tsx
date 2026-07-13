/**
 * WebFormsTest — internal test harness for the Web Forms submission pipeline.
 * Accessible at /web-forms/test  and  /web-forms/test/:formId
 * Available in all builds (this project is a prototype — not gated by environment).
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  FlaskConical, ArrowLeft, ChevronRight, CheckCircle2,
  AlertCircle, User, Layers, Eye, RefreshCw, Send,
  ClipboardList, Info, X
} from "lucide-react";
import { toast } from "sonner";
import { INITIAL_FORMS, Form, FieldDef } from "../../data/forms";
import { initialClients } from "./ClientProfile";
import { appendClientSubmission } from "../../data/submissionsStore";
import type { Submission } from "./WebForms";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  processes: string[];
  stage: string;
  lastContact: string;
  status: string;
  location?: string;
}

interface SubmitResult {
  success: boolean;
  submissionId: string;
  fieldData: Record<string, string>;
  clientCreated?: Client;
  clientMatched?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadForms(): Form[] {
  try {
    const raw = sessionStorage.getItem("webForms");
    return raw ? (JSON.parse(raw) as Form[]) : INITIAL_FORMS;
  } catch {
    return INITIAL_FORMS;
  }
}

function loadClients(): Client[] {
  try {
    const raw = sessionStorage.getItem("clients");
    // Fall back to the same initialClients seed used by Clients.tsx so that a
    // fresh session (sessionStorage key absent) doesn't lose the 30 mock records.
    return raw ? JSON.parse(raw) : (initialClients as unknown as Client[]);
  } catch {
    return initialClients as unknown as Client[];
  }
}

function saveClients(clients: Client[]) {
  sessionStorage.setItem("clients", JSON.stringify(clients));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    purple: "bg-violet-50 text-violet-700 border border-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color] ?? map.blue}`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      {label}
    </span>
  );
}

function FormCard({ form, active, onClick }: { form: Form; active: boolean; onClick: () => void }) {
  const statusColor = form.status === "live" ? "green" : "yellow";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
        active
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-transparent bg-white hover:border-blue-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              active ? "bg-blue-500" : "bg-gray-100 group-hover:bg-blue-100"
            }`}
          >
            <ClipboardList className={`w-4 h-4 ${active ? "text-white" : "text-gray-500 group-hover:text-blue-500"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
              {form.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
              {form.fields?.length ?? 0} fields
            </p>
          </div>
        </div>
        <Badge label={form.status} color={statusColor} />
      </div>
      {form.autoCreateClient && (
        <div
          className="mt-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <User className="w-3 h-3 flex-shrink-0" />
          Auto-creates client → {form.autoCreateProcessId}: {form.autoCreateStageId}
        </div>
      )}
    </button>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseClass =
    "w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all";

  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? `Enter ${field.label}…`}
        className={`${baseClass} resize-none`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      />
    );
  }

  if (field.type === "select" || field.type === "radio") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClass}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <option value="">Select an option…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  const typeMap: Record<string, string> = {
    email: "email", phone: "tel", number: "number",
    password: "password", date: "date",
  };

  return (
    <input
      type={typeMap[field.type] ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder ?? `Enter ${field.label}…`}
      className={baseClass}
      style={{ fontFamily: "Outfit, sans-serif" }}
    />
  );
}

function ResultPanel({ result, onClose }: { result: SubmitResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-5 flex items-center gap-4 ${result.success ? "bg-emerald-50" : "bg-red-50"}`}>
          {result.success
            ? <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            : <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />}
          <div>
            <h3 className="font-bold text-lg" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
              {result.success ? "Submission Successful" : "Submission Failed"}
            </h3>
            <p className="text-sm" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
              ID: <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-xs">{result.submissionId}</code>
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-black/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {result.clientCreated && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                <User className="w-4 h-4" /> New Client Auto-Created
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                <div><span className="text-gray-500">ID</span><br /><span className="font-medium">{result.clientCreated.id}</span></div>
                <div><span className="text-gray-500">Name</span><br /><span className="font-medium">{result.clientCreated.name}</span></div>
                <div><span className="text-gray-500">Email</span><br /><span className="font-medium">{result.clientCreated.email || "—"}</span></div>
                <div><span className="text-gray-500">Stage</span><br /><span className="font-medium">{result.clientCreated.stage}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Processes</span><br /><span className="font-medium">{result.clientCreated.processes.join(", ") || "—"}</span></div>
              </div>
            </div>
          )}
          {result.clientMatched && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700" style={{ fontFamily: "Outfit, sans-serif" }}>
              <div className="flex items-center gap-2 font-semibold mb-1"><User className="w-4 h-4" /> Matched Existing Client</div>
              <code className="text-xs font-mono">{result.clientMatched}</code>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Submitted Data</p>
            <div className="space-y-2">
              {Object.entries(result.fieldData).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 text-sm bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-medium min-w-[120px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>{k}</span>
                  <span style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>{v || <em className="text-gray-400">empty</em>}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WebFormsTest() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId?: string }>();

  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loaded = loadForms();
    setForms(loaded);
    if (formId) {
      const target = loaded.find((f) => String(f.id) === formId);
      if (target) setSelectedForm(target);
    }
  }, [formId]);

  useEffect(() => {
    setFieldValues({});
    setResult(null);
  }, [selectedForm?.id]);

  function handleSelectForm(form: Form) {
    setSelectedForm(form);
    navigate(`/web-forms/test/${form.id}`, { replace: true });
  }

  function handleReset() {
    setFieldValues({});
    setResult(null);
  }

  function handleSubmit() {
    if (!selectedForm) return;
    setSubmitting(true);

    setTimeout(() => {
      const fields = selectedForm.fields ?? [];
      const fieldData: Record<string, string> = {};

      for (const field of fields) {
        const val = fieldValues[field.label] ?? "";
        fieldData[field.label] = val;
        if (field.required && !val.trim()) {
          toast.error(`"${field.label}" is required.`);
          setSubmitting(false);
          return;
        }
      }

      const submissionId = `SUB-${String(Date.now()).slice(-8)}`;

      const submittedName = Object.entries(fieldValues).find(([label]) => {
        const f = fields.find((fi) => fi.label === label);
        return f && /name/i.test(f.label);
      })?.[1] ?? "";
      const submittedEmail = Object.entries(fieldValues).find(([label]) => {
        const f = fields.find((fi) => fi.label === label);
        return f && (/email/i.test(f.label) || f.type === "email");
      })?.[1] ?? "";
      const submittedPhone = Object.entries(fieldValues).find(([label]) => {
        const f = fields.find((fi) => fi.label === label);
        return f && (/phone/i.test(f.label) || f.type === "tel");
      })?.[1] ?? "";

      let resolvedClientId = "";

      let clientCreated: Client | undefined;
      let clientMatched: string | undefined;

      if (selectedForm.autoCreateClient) {
        const existingClients = loadClients();
        const existing = submittedEmail
          ? existingClients.find((c) => c.email.toLowerCase() === submittedEmail.toLowerCase())
          : undefined;

        if (existing) {
          clientMatched = `${existing.id} — ${existing.name}`;
          resolvedClientId = existing.id;
        } else {
          // Precedence rule: a form field explicitly bound to the "processes" system
          // key (sourceFieldKey === "processes") or whose label matches /process/i
          // takes precedence over the form-level autoCreateProcessId default.
          const processField = fields.find(
            (f) => f.sourceFieldKey === "processes" || /process/i.test(f.label)
          );
          const submittedProcess = processField
            ? (fieldValues[processField.label] ?? "").trim()
            : "";
          const processName = submittedProcess || selectedForm.autoCreateProcessId || "";
          const stageName = selectedForm.autoCreateStageId || "Initial Contact";
          const stageLabel = processName ? `${processName}: ${stageName}` : stageName;

          // Resolve country from a submitted field if available
          const countryField = fields.find(
            (f) => f.sourceFieldKey === "country" || /^country$/i.test(f.label)
          );
          const resolvedCountry = countryField
            ? (fieldValues[countryField.label] || "US")
            : "US";

          const newClient: Client = {
            id: `CL-${String(Date.now()).slice(-6)}`,
            name: submittedName || submittedEmail || "New Contact",
            email: submittedEmail,
            phone: submittedPhone.replace(/\D/g, ""),
            country: resolvedCountry,
            countryCode: "+1",
            countryFlag: "🇺🇸",
            processes: processName ? [processName] : [],
            stage: stageLabel,
            lastContact: new Date().toISOString().split("T")[0],
            status: "Active",
          };

          // Map every submitted field value that has a sourceFieldKey onto the
          // client record so custom fields (patient_id, insurance_provider, role,
          // company, etc.) are actually persisted, not just shown in the modal.
          fields.forEach((f) => {
            const val = fieldValues[f.label];
            if (!val || !f.sourceFieldKey) return;
            const key = f.sourceFieldKey;
            // Skip fields already mapped above
            if (["email", "phone", "processes", "country"].includes(key)) return;
            if (key === "name") return; // already in newClient.name
            if (key === "company") { (newClient as any).companyName = val; return; }
            if (key === "role") { (newClient as any).jobPosition = val; return; }
            (newClient as unknown as Record<string, unknown>)[key] = val;
          });

          try {
            // Prepend new client so they appear at the top of Clients list immediately
            saveClients([newClient, ...existingClients]);

            // Verification check: ensure client actually exists and is retrievable afterward
            const verified = loadClients();
            if (verified.some(c => c.id === newClient.id)) {
              clientCreated = newClient;
              resolvedClientId = newClient.id;
              toast.success(`Client created: ${newClient.name}`);
            } else {
              throw new Error("Client write verification failed");
            }
          } catch (err) {
            console.error("Client creation failed:", err);
            toast.error("Failed to auto-create client record.");
            clientCreated = undefined;
          }
        }
      }

      // Write a ClientFormSubmission so the client's Forms tab reflects this submission.
      // Also write to the webFormSubmissions sessionStorage key so the Submissions tab
      // in WebForms.tsx shows this test entry, and the "View" button opens the correct
      // client drawer with the matching submission auto-expanded.
      if (resolvedClientId) {
        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        // 1. Write to clientFormSubmissions (for ClientProfile Forms tab)
        appendClientSubmission({
          clientId: resolvedClientId,
          formId: selectedForm.id,
          sentAt: new Date().toISOString().split("T")[0],
          submittedAt: today,  // must match Submission.date below for the find() in ClientProfile
          status: "completed",
          fields: fieldData,
        });

        // 2. Write to webFormSubmissions (for WebForms Submissions tab)
        try {
          const resolvedName = submittedName || submittedEmail || "Anonymous";
          const newWebSub: Submission = {
            id: Date.now(),
            clientId: resolvedClientId,
            formId: selectedForm.id,
            name: resolvedName,
            email: submittedEmail,
            date: today,           // same string as submittedAt above
            status: "completed",
            fields: fieldData,
          };
          const raw = sessionStorage.getItem("webFormSubmissions");
          const existing: Submission[] = raw ? JSON.parse(raw) : [];
          sessionStorage.setItem("webFormSubmissions", JSON.stringify([newWebSub, ...existing]));
        } catch (err) {
          console.warn("Failed to write to webFormSubmissions:", err);
        }
      }

      // Check if any fields belong to the "appointment" module and create appointment
      const hasAppointmentField = fields.some((f) => f.module === "appointment");
      if (hasAppointmentField) {
        const appt: any = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          clientName: submittedName || "Anonymous",
          clientEmail: submittedEmail,
          clientPhone: submittedPhone,
          date: "",
          time: "",
          status: "pending-accept",
          notes: "Submitted via form",
          service: selectedForm.name,
          employeeId: 1,
          serviceId: 1,
          duration: 60,
        };

        fields.forEach((f) => {
          const val = fieldValues[f.label];
          if (!val || f.module !== "appointment") return;
          if (f.sourceFieldKey === "appointment_date") appt.date = val;
          else if (f.sourceFieldKey === "appointment_time") appt.time = val;
          else if (f.sourceFieldKey === "status") appt.status = val;
          else if (f.sourceFieldKey === "provider") {
            appt.notes = (appt.notes || "") + `\nProvider: ${val}`;
          } else {
            // Store custom/other fields on the appointment
            if (f.sourceFieldKey) {
              appt[f.sourceFieldKey] = val;
            }
          }
        });

        // Clean up notes
        appt.notes = appt.notes.trim();

        const existingApptsRaw = sessionStorage.getItem("appointments_v1");
        const existingAppts = existingApptsRaw ? JSON.parse(existingApptsRaw) : [];
        sessionStorage.setItem("appointments_v1", JSON.stringify([appt, ...existingAppts]));
        toast.success("Appointment scheduled successfully ✓");
      }

      setResult({ success: true, submissionId, fieldData, clientCreated, clientMatched });
      toast.success("Form submitted successfully!");
      setSubmitting(false);
    }, 600);
  }

  const fields = selectedForm?.fields ?? [];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)" }}>
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/web-forms")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                Form Test Harness
              </h1>
              <p className="text-xs mt-0.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                Tests submission &amp; client auto-creation pipeline
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Badge label="Internal Tool" color="blue" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* ── Left: Form List ── */}
          <div className="col-span-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Available Forms ({forms.length})
                </span>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {forms.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                    No forms found. Create one first.
                  </div>
                ) : (
                  forms.map((form) => (
                    <FormCard
                      key={form.id}
                      form={form}
                      active={selectedForm?.id === form.id}
                      onClick={() => handleSelectForm(form)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Fill & Submit ── */}
          <div className="col-span-8">
            {!selectedForm ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm h-full flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center">
                  <Eye className="w-7 h-7 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-600" style={{ fontFamily: "DM Sans, sans-serif" }}>Select a form to test</p>
                  <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Choose a form from the left to fill out and submit</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Info className="w-3.5 h-3.5" />
                  Submissions use the real pipeline — clients are written to sessionStorage
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta Card */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-xl" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                        {selectedForm.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge label={selectedForm.status} color={selectedForm.status === "live" ? "green" : "yellow"} />
                        <span className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>{fields.length} fields</span>
                        {selectedForm.autoCreateClient && (
                          <>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <span className="text-xs text-violet-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Auto-creates clients</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600" title="Reset">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedForm.autoCreateClient && (
                    <div className="mt-4 grid grid-cols-2 gap-3 p-4 bg-violet-50 rounded-2xl border border-violet-200">
                      <div>
                        <p className="text-xs font-medium text-violet-500 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Assign to Process</p>
                        <p className="text-sm font-semibold text-violet-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {selectedForm.autoCreateProcessId || <em className="font-normal text-violet-400">Not set</em>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-violet-500 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Initial Stage</p>
                        <p className="text-sm font-semibold text-violet-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {selectedForm.autoCreateStageId || <em className="font-normal text-violet-400">Not set</em>}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fields Card */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white shadow-sm p-6">
                  {fields.length === 0 ? (
                    <div className="text-center py-10 text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No fields yet. Open the Form Builder to add some.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {fields.map((field) => (
                        <div key={field.label}>
                          <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <FieldInput
                            field={field}
                            value={fieldValues[field.label] ?? ""}
                            onChange={(v) => handleFieldChange(field.label, v)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Submissions are written to sessionStorage and reflected across the app
                    </p>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || fields.length === 0}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100"
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        background: submitting ? "#94A3B8" : "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
                        boxShadow: submitting ? "none" : "0 4px 20px rgba(99,102,241,0.3)",
                      }}
                    >
                      {submitting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</>
                      ) : (
                        <><Send className="w-4 h-4" />Submit Test</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {result && <ResultPanel result={result} onClose={() => setResult(null)} />}
    </div>
  );

  function handleFieldChange(fieldLabel: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldLabel]: value }));
  }
}
