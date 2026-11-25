import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  Lock,
  FileText,
  Sparkles,
  Plus,
  Send,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Activity,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import CPTCodeInput from "../ui/CPTCodeInput";
import NewConsultationDrawer from "../scribe/NewConsultationDrawer";
import { useTeamMembers } from "../../../lib/teamStore";
import { searchICDCodes, getICDCodeItem } from "../../../lib/icdCodes";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
import { getEhrSessionNoteTargets, EhrSessionNotePushTarget } from "../../../lib/integrationsRegistry";
import {
  SessionNote,
  SessionNoteTemplateType,
  SessionNoteVitals,
  SESSION_NOTE_TEMPLATES,
  saveSessionNote,
  signAndLockSessionNote,
  addSessionNoteAddendum,
  publishVisitSummaryToPatient,
  syncExistingNoteToEhr,
  mapScribeSessionToSections,
} from "../../../lib/sessionNotesStore";

export interface SessionNoteEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  appointment?: {
    id: string;
    title?: string;
    date?: string;
    employeeName?: string;
  };
  processId?: string;
  processName?: string;
  initialNote?: SessionNote | null;
  initialScribeSession?: ScribeSession | null;
  zIndex?: number;
  onSaved?: (note: SessionNote) => void;
}

const TEMPLATE_LIST: SessionNoteTemplateType[] = ["SOAP", "DAP", "BIRP", "Procedure", "Freeform"];

export default function SessionNoteEditorDrawer({
  isOpen,
  onClose,
  client,
  appointment,
  processId,
  processName,
  initialNote,
  initialScribeSession,
  zIndex = 650,
  onSaved,
}: SessionNoteEditorDrawerProps) {
  const { teamMembers } = useTeamMembers();

  const [noteId, setNoteId] = useState<string>("");
  const [templateType, setTemplateType] = useState<SessionNoteTemplateType>("SOAP");
  const [title, setTitle] = useState("");
  const [providerName, setProviderName] = useState("Dr. Akshita Sharma");
  const [sessionDate, setSessionDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState<SessionNoteVitals>({});
  const [showVitals, setShowVitals] = useState(false);
  const [icd10Codes, setIcd10Codes] = useState<string[]>([]);
  const [cptCodes, setCptCodes] = useState<string[]>([]);
  const [status, setStatus] = useState<"draft" | "signed">("draft");
  const [signedAt, setSignedAt] = useState<string | undefined>(undefined);
  const [signedBy, setSignedBy] = useState<string | undefined>(undefined);
  const [addendums, setAddendums] = useState<SessionNote["addendums"]>([]);
  const [ehrSyncRecords, setEhrSyncRecords] = useState<SessionNote["ehrSyncRecords"]>([]);
  const [sharedToPatient, setSharedToPatient] = useState(false);
  const [linkedScribeId, setLinkedScribeId] = useState<string | undefined>(undefined);

  // Sub-controls state
  const [icdQuery, setIcdQuery] = useState("");
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [cptInputVal, setCptInputVal] = useState("");
  const [addendumText, setAddendumText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingEhr, setIsSyncingEhr] = useState(false);
  const [showScribeRecorder, setShowScribeRecorder] = useState(false);
  const [ehrTargets, setEhrTargets] = useState<EhrSessionNotePushTarget[]>([]);

  // Available AI Scribe sessions for this client
  const clientScribeSessions = useMemo(() => {
    const all = getScribeSessions();
    const cid = String(client?.id || "").toLowerCase();
    const cname = (client?.name || "").trim().toLowerCase();
    return all.filter(
      (s) =>
        (cid && String(s.clientId).toLowerCase() === cid) ||
        (cname && (s.clientName || "").trim().toLowerCase() === cname)
    );
  }, [client?.id, client?.name, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setEhrTargets(getEhrSessionNoteTargets());

    if (initialNote) {
      setNoteId(initialNote.id);
      setTemplateType(initialNote.templateType);
      setTitle(initialNote.title);
      setProviderName(initialNote.providerName || "Dr. Akshita Sharma");
      setSessionDate(
        initialNote.sessionDate
          ? new Date(initialNote.sessionDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setDurationMinutes(initialNote.durationMinutes || 30);
      setSections(initialNote.sections || {});
      setVitals(initialNote.vitals || {});
      setShowVitals(Boolean(initialNote.vitals && Object.values(initialNote.vitals).some(Boolean)));
      setIcd10Codes(initialNote.icd10Codes || []);
      setCptCodes(initialNote.cptCodes || []);
      setStatus(initialNote.status);
      setSignedAt(initialNote.signedAt);
      setSignedBy(initialNote.signedBy);
      setAddendums(initialNote.addendums || []);
      setEhrSyncRecords(initialNote.ehrSyncRecords || []);
      setSharedToPatient(Boolean(initialNote.sharedToPatient));
      setLinkedScribeId(initialNote.scribeSessionId);
    } else if (initialScribeSession) {
      const tpl: SessionNoteTemplateType = "SOAP";
      const mapped = mapScribeSessionToSections(initialScribeSession, tpl);
      setNoteId(`sn-${Date.now()}`);
      setTemplateType(tpl);
      setTitle(mapped.title);
      setProviderName(initialScribeSession.doctorName || appointment?.employeeName || "Dr. Akshita Sharma");
      setSessionDate(new Date().toISOString().slice(0, 16));
      setDurationMinutes(Math.max(15, Math.round((initialScribeSession.durationSeconds || 900) / 60)));
      setSections(mapped.sections);
      setVitals(mapped.vitals || {});
      setShowVitals(Boolean(mapped.vitals && Object.values(mapped.vitals).some(Boolean)));
      setIcd10Codes(mapped.icd10Codes);
      setCptCodes([]);
      setStatus("draft");
      setSignedAt(undefined);
      setSignedBy(undefined);
      setAddendums([]);
      setEhrSyncRecords([]);
      setSharedToPatient(false);
      setLinkedScribeId(initialScribeSession.id);
    } else {
      setNoteId(`sn-${Date.now()}`);
      setTemplateType("SOAP");
      setTitle(appointment?.title ? `${appointment.title} Note` : "Clinical Consultation Note");
      setProviderName(appointment?.employeeName || teamMembers[1]?.name || "Dr. Akshita Sharma");
      setSessionDate(
        appointment?.date && !appointment.date.includes("T")
          ? `${appointment.date}T10:00`
          : new Date().toISOString().slice(0, 16)
      );
      setDurationMinutes(30);
      setSections({});
      setVitals({});
      setShowVitals(false);
      setIcd10Codes([]);
      setCptCodes([]);
      setStatus("draft");
      setSignedAt(undefined);
      setSignedBy(undefined);
      setAddendums([]);
      setEhrSyncRecords([]);
      setSharedToPatient(false);
      setLinkedScribeId(undefined);
    }

    setAddendumText("");
    setIcdQuery("");
    setCptInputVal("");
  }, [isOpen, initialNote, initialScribeSession, appointment?.id]);

  if (!isOpen) return null;

  const isSigned = status === "signed";
  const currentSpec = SESSION_NOTE_TEMPLATES[templateType];
  const icdSuggestions = searchICDCodes(icdQuery, 10);
  const connectedEhrs = ehrTargets.filter((t) => t.connected && t.sessionNotesEnabled);

  const handleApplyScribe = (scribeId: string) => {
    const found = clientScribeSessions.find((s) => s.id === scribeId);
    if (!found) return;
    const mapped = mapScribeSessionToSections(found, templateType);
    setSections((prev) => ({ ...prev, ...mapped.sections }));
    if (mapped.vitals) {
      setVitals(mapped.vitals);
      setShowVitals(true);
    }
    if (mapped.icd10Codes.length > 0) {
      setIcd10Codes((prev) => Array.from(new Set([...prev, ...mapped.icd10Codes])));
    }
    if (!title.trim() || title === "Clinical Consultation Note") {
      setTitle(mapped.title);
    }
    setLinkedScribeId(found.id);
    toast.success(`Populated ${templateType} sections from AI Scribe`);
  };

  const handleSaveDraft = () => {
    if (!title.trim()) {
      toast.error("Please enter a note title");
      return;
    }
    const saved = saveSessionNote(
      {
        id: noteId,
        clientId: String(client.id),
        clientName: client.name,
        appointmentId: appointment?.id ? String(appointment.id) : initialNote?.appointmentId,
        appointmentTitle: appointment?.title || initialNote?.appointmentTitle,
        processId: processId || initialNote?.processId,
        processName: processName || initialNote?.processName,
        scribeSessionId: linkedScribeId,
        providerName,
        sessionDate: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
        durationMinutes,
        title: title.trim(),
        templateType,
        sections,
        vitals: showVitals ? vitals : undefined,
        icd10Codes,
        cptCodes,
        status: "draft",
        sharedToPatient,
        sharedDocumentId: initialNote?.sharedDocumentId,
      },
      { logActivity: !initialNote }
    );
    toast.success("Session note saved as draft");
    onSaved?.(saved);
    onClose();
  };

  const handleSignAndLock = async () => {
    if (!title.trim()) {
      toast.error("Please enter a note title before signing");
      return;
    }
    const hasContent = Object.values(sections).some((v) => String(v || "").trim().length > 0);
    if (!hasContent) {
      toast.error("Please document at least one section before signing");
      return;
    }

    setIsSubmitting(true);
    try {
      saveSessionNote(
        {
          id: noteId,
          clientId: String(client.id),
          clientName: client.name,
          appointmentId: appointment?.id ? String(appointment.id) : initialNote?.appointmentId,
          appointmentTitle: appointment?.title || initialNote?.appointmentTitle,
          processId: processId || initialNote?.processId,
          processName: processName || initialNote?.processName,
          scribeSessionId: linkedScribeId,
          providerName,
          sessionDate: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
          durationMinutes,
          title: title.trim(),
          templateType,
          sections,
          vitals: showVitals ? vitals : undefined,
          icd10Codes,
          cptCodes,
          status: "draft",
          sharedToPatient,
          sharedDocumentId: initialNote?.sharedDocumentId,
        },
        { logActivity: false }
      );

      const { note: signedNote, syncedEhrs } = await signAndLockSessionNote(noteId, providerName, {
        autoSyncConnectedEhr: true,
      });

      if (signedNote) {
        toast.success(
          syncedEhrs.length > 0
            ? `Note signed, locked, and synced to ${syncedEhrs.join(", ")}`
            : "Session note signed & locked"
        );
        onSaved?.(signedNote);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualEhrPush = async (targetId?: string) => {
    setIsSyncingEhr(true);
    try {
      // Ensure latest state is persisted before pushing
      saveSessionNote({
        id: noteId,
        clientId: String(client.id),
        clientName: client.name,
        appointmentId: appointment?.id ? String(appointment.id) : initialNote?.appointmentId,
        appointmentTitle: appointment?.title || initialNote?.appointmentTitle,
        scribeSessionId: linkedScribeId,
        providerName,
        sessionDate: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
        durationMinutes,
        title: title.trim() || "Session Note",
        templateType,
        sections,
        vitals: showVitals ? vitals : undefined,
        icd10Codes,
        cptCodes,
        status,
        signedAt,
        signedBy,
        sharedToPatient,
      });

      const targetIds = targetId
        ? [targetId]
        : connectedEhrs.length > 0
        ? connectedEhrs.map((t) => t.integrationId)
        : [ehrTargets[0]?.integrationId || "cliniko"];

      const { note: updated, syncedNames } = await syncExistingNoteToEhr(noteId, targetIds);
      if (updated) {
        setEhrSyncRecords(updated.ehrSyncRecords);
        onSaved?.(updated);
      }
      if (syncedNames.length > 0) {
        toast.success(`Pushed session note to ${syncedNames.join(", ")}`);
      }
    } finally {
      setIsSyncingEhr(false);
    }
  };

  const handleAddAddendum = () => {
    if (!addendumText.trim()) return;
    const updated = addSessionNoteAddendum(noteId, addendumText, providerName);
    if (updated) {
      setAddendums(updated.addendums);
      setAddendumText("");
      toast.success("Addendum appended to locked note");
      onSaved?.(updated);
    }
  };

  const handleSharePatientSummary = () => {
    const updated = publishVisitSummaryToPatient(noteId);
    if (updated) {
      setSharedToPatient(true);
      toast.success("After-Visit Summary published to Client Documents & Patient Portal");
      onSaved?.(updated);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        style={{ zIndex }}
      >
        <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          {/* ── TOP HEADER ── */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 truncate">
                    {initialNote ? "Session Note" : "New Session Note"}
                  </h2>
                  {isSigned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Lock className="w-3 h-3" />
                      Signed & Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {client.name}
                  {appointment?.title ? ` · ${appointment.title}` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── SCROLLABLE EDITOR BODY ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
            {/* Signed Lock Banner */}
            {isSigned && (
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Signed by <span className="font-semibold">{signedBy || providerName}</span> on{" "}
                    {signedAt ? new Date(signedAt).toLocaleString() : "file"} — chart content is locked.
                  </span>
                </div>
                {sharedToPatient ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Visit Summary Shared
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSharePatientSummary}
                    className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Send className="w-3 h-3" /> Share Visit Summary
                  </button>
                )}
              </div>
            )}

            {/* 1. Template Switcher & AI Scribe Prefill Bar */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Note Format
                </span>
                {!isSigned && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {clientScribeSessions.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleApplyScribe(e.target.value);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer focus:outline-none"
                      >
                        <option value="">Prefill from AI Scribe ({clientScribeSessions.length})...</option>
                        {clientScribeSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title || s.extractedData?.diagnosis || "Consultation"} (
                            {new Date(s.sessionDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowScribeRecorder(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Dictate via AI Scribe</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TEMPLATE_LIST.map((tpl) => {
                  const spec = SESSION_NOTE_TEMPLATES[tpl];
                  const active = templateType === tpl;
                  return (
                    <button
                      key={tpl}
                      type="button"
                      disabled={isSigned}
                      onClick={() => setTemplateType(tpl)}
                      className={`px-3 py-2 rounded-lg border text-left transition-all ${
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      } ${isSigned ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="text-xs font-semibold">{spec.shortName}</div>
                      <div className={`text-[10px] truncate ${active ? "text-slate-300" : "text-slate-400"}`}>
                        {tpl === "SOAP"
                          ? "S · O · A · P"
                          : tpl === "DAP"
                          ? "D · A · P"
                          : tpl === "BIRP"
                          ? "B · I · R · P"
                          : tpl === "Procedure"
                          ? "Clinical Proc"
                          : "Open Note"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Encounter Metadata */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700">Note Title *</label>
                <input
                  type="text"
                  value={title}
                  disabled={isSigned}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Initial Consultation & Care Plan"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clinician / Provider</span>
                </label>
                <select
                  value={providerName}
                  disabled={isSigned}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.role ? `(${m.role})` : ""}
                    </option>
                  ))}
                  {!teamMembers.some((m) => m.name === providerName) && (
                    <option value={providerName}>{providerName}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Session Date</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionDate}
                    disabled={isSigned}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duration (min)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMinutes}
                    disabled={isSigned}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 3. Optional Vitals Strip */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVitals((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vitals & Measurements (Optional)</span>
                </span>
                {showVitals ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showVitals && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { key: "bloodPressure", label: "BP (mmHg)", ph: "120/80" },
                    { key: "pulse", label: "Pulse (bpm)", ph: "72" },
                    { key: "temperature", label: "Temp", ph: "98.6°F" },
                    { key: "spo2", label: "SpO2", ph: "99%" },
                    { key: "weight", label: "Weight", ph: "68 kg" },
                  ].map((vField) => (
                    <div key={vField.key} className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">{vField.label}</label>
                      <input
                        type="text"
                        disabled={isSigned}
                        value={(vitals as any)[vField.key] || ""}
                        onChange={(e) => setVitals((prev) => ({ ...prev, [vField.key]: e.target.value }))}
                        placeholder={vField.ph}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Structured Clinical Sections */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentSpec.label} Sections
                </h3>
                <span className="text-[11px] text-slate-400">{currentSpec.description}</span>
              </div>

              {currentSpec.sections.map((sec) => (
                <div key={sec.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 block">{sec.label}</label>
                  <textarea
                    rows={sec.rows || 3}
                    disabled={isSigned}
                    value={sections[sec.key] || ""}
                    onChange={(e) => setSections((prev) => ({ ...prev, [sec.key]: e.target.value }))}
                    placeholder={sec.placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                  />
                </div>
              ))}
            </div>

            {/* 5. Diagnosis (ICD-10) & Billing Codes (CPT) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Clinical Coding (ICD-10 & CPT)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ICD-10 Selector */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-medium text-slate-700 block">ICD-10 Diagnosis Codes</label>
                  {!isSigned && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={icdQuery}
                        onFocus={() => setShowIcdDropdown(true)}
                        onChange={(e) => {
                          setIcdQuery(e.target.value);
                          setShowIcdDropdown(true);
                        }}
                        placeholder="Search ICD-10 code or condition..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      {showIcdDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {icdSuggestions.map((item) => (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                if (!icd10Codes.includes(item.code)) {
                                  setIcd10Codes((prev) => [...prev, item.code]);
                                }
                                setIcdQuery("");
                                setShowIcdDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="text-xs text-slate-700 truncate">{item.shortDescription}</span>
                              <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                {item.code}
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowIcdDropdown(false)}
                            className="w-full px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 text-center bg-slate-50 cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {icd10Codes.length === 0 ? (
                      <span className="text-[11px] text-slate-400">No ICD-10 codes selected</span>
                    ) : (
                      icd10Codes.map((code) => {
                        const meta = getICDCodeItem(code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200/70"
                            title={meta?.shortDescription || code}
                          >
                            <span>{code}</span>
                            {meta && <span className="font-sans text-blue-600/80 max-w-[140px] truncate">· {meta.shortDescription}</span>}
                            {!isSigned && (
                              <button
                                type="button"
                                onClick={() => setIcd10Codes((prev) => prev.filter((c) => c !== code))}
                                className="hover:text-rose-600 cursor-pointer ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* CPT Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 block">CPT / Service Codes</label>
                  {!isSigned && (
                    <CPTCodeInput
                      value={cptInputVal}
                      disabled={isSigned}
                      onChange={(code, opt) => {
                        setCptInputVal(code);
                        if (opt && !cptCodes.includes(opt.code)) {
                          setCptCodes((prev) => [...prev, opt.code]);
                          setCptInputVal("");
                        }
                      }}
                      placeholder="Search CPT (e.g. 90834, 99213)..."
                      className="py-2 text-xs"
                    />
                  )}
                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {cptCodes.length === 0 ? (
                      <span className="text-[11px] text-slate-400">No CPT codes selected</span>
                    ) : (
                      cptCodes.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          <span>{code}</span>
                          {!isSigned && (
                            <button
                              type="button"
                              onClick={() => setCptCodes((prev) => prev.filter((c) => c !== code))}
                              className="hover:text-rose-600 cursor-pointer ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. External EHR Sync Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    External EHR Sync
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {connectedEhrs.length > 0
                      ? `Signing auto-syncs to ${connectedEhrs.map((t) => t.integrationName).join(", ")}.`
                      : "No external EHR currently connected with Session Note sync enabled."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={isSyncingEhr}
                  onClick={() => handleManualEhrPush()}
                  className="text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEhr ? "animate-spin" : ""}`} />
                  <span>{connectedEhrs.length > 0 ? "Push to EHR" : "Test EHR Push"}</span>
                </Button>
              </div>

              {ehrSyncRecords.length > 0 && (
                <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                  {ehrSyncRecords.map((rec) => (
                    <div
                      key={`${rec.integrationId}-${rec.externalNoteId}`}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-800">{rec.integrationName}</span>
                        <span className="font-mono text-[11px] text-slate-500 truncate">{rec.externalNoteId}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(rec.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Signed Addendums Section */}
            {isSigned && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Signed Note Addendums ({addendums.length})
                </h3>

                {addendums.length > 0 && (
                  <div className="space-y-2">
                    {addendums.map((add) => (
                      <div key={add.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{add.authorName}</span>
                          <span>{new Date(add.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-line">{add.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <textarea
                    rows={2}
                    value={addendumText}
                    onChange={(e) => setAddendumText(e.target.value)}
                    placeholder="Append an addendum to this signed clinical record..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!addendumText.trim()}
                    onClick={handleAddAddendum}
                    className="self-end text-xs font-semibold shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Addendum
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500">
              {isSigned ? "Signed EHR chart record" : "Editable clinical draft"}
            </div>

            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} className="font-medium text-xs">
                {isSigned ? "Close" : "Cancel"}
              </Button>
              {!isSigned && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    className="font-semibold text-xs"
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    loading={isSubmitting}
                    onClick={handleSignAndLock}
                    className="font-semibold text-xs gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign & Lock</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline AI Scribe Recorder */}
      <NewConsultationDrawer
        isOpen={showScribeRecorder}
        onClose={() => setShowScribeRecorder(false)}
        initialClientId={String(client.id)}
        initialClientName={client.name}
        initialEntityType={appointment?.id ? "appointment" : "client"}
        initialRecordId={appointment?.id ? String(appointment.id) : undefined}
        initialAppointmentId={appointment?.id ? String(appointment.id) : undefined}
        initialAttendeeName={providerName}
        zIndex={zIndex + 50}
        onSessionCreated={(newSession) => {
          setShowScribeRecorder(false);
          const mapped = mapScribeSessionToSections(newSession, templateType);
          setSections((prev) => ({ ...prev, ...mapped.sections }));
          if (mapped.vitals) {
            setVitals(mapped.vitals);
            setShowVitals(true);
          }
          if (mapped.icd10Codes.length > 0) {
            setIcd10Codes((prev) => Array.from(new Set([...prev, ...mapped.icd10Codes])));
          }
          setLinkedScribeId(newSession.id);
          toast.success("AI Scribe output applied to session note");
        }}
      />
    </>
  );
}
