import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import NewConsultationDrawer from "../scribe/NewConsultationDrawer";
import NoteTemplateBuilderDrawer from "./NoteTemplateBuilderDrawer";
import { useTeamMembers } from "../../../lib/teamStore";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
import { getEhrSessionNoteTargets, EhrSessionNotePushTarget } from "../../../lib/integrationsRegistry";
import {
  NoteTemplate,
  NOTE_TEMPLATES_EVENT,
  getNoteTemplates,
  getNoteTemplateById,
} from "../../../lib/noteTemplatesStore";
import {
  SessionNote,
  SessionNoteTemplateType,
  SessionNoteVitals,
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

  const [templates, setTemplates] = useState<NoteTemplate[]>(() => getNoteTemplates({ onlyEnabled: true }));
  const [noteId, setNoteId] = useState<string>("");
  const [templateType, setTemplateType] = useState<SessionNoteTemplateType>("SOAP");
  const [title, setTitle] = useState("");
  const [providerName, setProviderName] = useState("Dr. Akshita Sharma");
  const [sessionDate, setSessionDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [vitals, setVitals] = useState<SessionNoteVitals>({});
  const [showVitals, setShowVitals] = useState(false);
  const [status, setStatus] = useState<"draft" | "signed">("draft");
  const [signedAt, setSignedAt] = useState<string | undefined>(undefined);
  const [signedBy, setSignedBy] = useState<string | undefined>(undefined);
  const [addendums, setAddendums] = useState<SessionNote["addendums"]>([]);
  const [ehrSyncRecords, setEhrSyncRecords] = useState<SessionNote["ehrSyncRecords"]>([]);
  const [sharedToPatient, setSharedToPatient] = useState(false);
  const [linkedScribeId, setLinkedScribeId] = useState<string | undefined>(undefined);

  // Sub-controls state
  const [addendumText, setAddendumText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingEhr, setIsSyncingEhr] = useState(false);
  const [showScribeRecorder, setShowScribeRecorder] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [ehrTargets, setEhrTargets] = useState<EhrSessionNotePushTarget[]>([]);

  // Reactive templates sync
  useEffect(() => {
    const syncTemplates = () => setTemplates(getNoteTemplates({ onlyEnabled: true }));
    window.addEventListener(NOTE_TEMPLATES_EVENT, syncTemplates);
    window.addEventListener("storage", syncTemplates);
    return () => {
      window.removeEventListener(NOTE_TEMPLATES_EVENT, syncTemplates);
      window.removeEventListener("storage", syncTemplates);
    };
  }, []);

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
    setTemplates(getNoteTemplates({ onlyEnabled: true }));

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
      setStatus(initialNote.status);
      setSignedAt(initialNote.signedAt);
      setSignedBy(initialNote.signedBy);
      setAddendums(initialNote.addendums || []);
      setEhrSyncRecords(initialNote.ehrSyncRecords || []);
      setSharedToPatient(Boolean(initialNote.sharedToPatient));
      setLinkedScribeId(initialNote.scribeSessionId);
    } else if (initialScribeSession) {
      const tpl = getNoteTemplateById("SOAP");
      const mapped = mapScribeSessionToSections(initialScribeSession, tpl.id);
      setNoteId(`sn-${Date.now()}`);
      setTemplateType(tpl.id);
      setTitle(mapped.title);
      setProviderName(initialScribeSession.doctorName || appointment?.employeeName || "Dr. Akshita Sharma");
      setSessionDate(new Date().toISOString().slice(0, 16));
      setDurationMinutes(Math.max(15, Math.round((initialScribeSession.durationSeconds || 900) / 60)));
      setSections(mapped.sections);
      setVitals(mapped.vitals || {});
      setShowVitals(Boolean(mapped.vitals && Object.values(mapped.vitals).some(Boolean)) || Boolean(tpl.includeVitals));
      setStatus("draft");
      setSignedAt(undefined);
      setSignedBy(undefined);
      setAddendums([]);
      setEhrSyncRecords([]);
      setSharedToPatient(false);
      setLinkedScribeId(initialScribeSession.id);
    } else {
      const defaultTpl = getNoteTemplateById("SOAP");
      setNoteId(`sn-${Date.now()}`);
      setTemplateType(defaultTpl.id);
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
      setShowVitals(Boolean(defaultTpl.includeVitals));
      setStatus("draft");
      setSignedAt(undefined);
      setSignedBy(undefined);
      setAddendums([]);
      setEhrSyncRecords([]);
      setSharedToPatient(false);
      setLinkedScribeId(undefined);
    }

    setAddendumText("");
  }, [isOpen, initialNote, initialScribeSession, appointment?.id]);

  if (!isOpen) return null;

  const isSigned = status === "signed";
  const currentSpec = templates.find((t) => t.id === templateType) || getNoteTemplateById(templateType);
  const connectedEhrs = ehrTargets.filter((t) => t.connected && t.sessionNotesEnabled);

  const handleSelectTemplate = (tpl: NoteTemplate) => {
    setTemplateType(tpl.id);
    if (tpl.includeVitals) setShowVitals(true);
  };

  const handleApplyScribe = (scribeId: string) => {
    const found = clientScribeSessions.find((s) => s.id === scribeId);
    if (!found) return;
    const mapped = mapScribeSessionToSections(found, templateType);
    setSections((prev) => ({ ...prev, ...mapped.sections }));
    if (mapped.vitals) {
      setVitals(mapped.vitals);
      setShowVitals(true);
    }
    if (!title.trim() || title === "Clinical Consultation Note") {
      setTitle(mapped.title);
    }
    setLinkedScribeId(found.id);
    toast.success(`Populated "${currentSpec.name}" sections from AI Scribe`);
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
        templateType: currentSpec.id,
        templateName: currentSpec.name,
        sections,
        vitals: showVitals ? vitals : undefined,
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
    const missingRequired = currentSpec.sections.find(
      (sec) => sec.required && !String(sections[sec.key] || "").trim()
    );
    if (missingRequired) {
      toast.error(`Please complete required section: "${missingRequired.label}"`);
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
          templateType: currentSpec.id,
          templateName: currentSpec.name,
          sections,
          vitals: showVitals ? vitals : undefined,
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
        templateType: currentSpec.id,
        templateName: currentSpec.name,
        sections,
        vitals: showVitals ? vitals : undefined,
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

  const toggleCheckboxOption = (secKey: string, opt: string) => {
    const currentList = (sections[secKey] || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const exists = currentList.includes(opt);
    const nextList = exists ? currentList.filter((item) => item !== opt) : [...currentList, opt];
    setSections((prev) => ({ ...prev, [secKey]: nextList.join(", ") }));
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        style={{ zIndex }}
      >
        {/* 65-70% Desktop Side Drawer */}
        <div className="w-full md:w-[68vw] md:min-w-[740px] md:max-w-[1180px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          {/* ── TOP HEADER ── */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 truncate">
                    {initialNote ? "Note" : "New Note"}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                    {currentSpec.shortName}
                  </span>
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

          {/* ── 2-COLUMN WIDE EHR BODY ── */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
            <div className="space-y-5">
              {/* Signed Status Strip */}
              {isSigned && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Signed by <span className="font-medium text-slate-700">{signedBy || providerName}</span>
                      {signedAt ? ` · ${new Date(signedAt).toLocaleString()}` : ""}
                      <span className="text-slate-400"> · Locked</span>
                    </span>
                  </div>
                  {sharedToPatient ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600/80" />
                      Visit summary shared
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSharePatientSummary}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send className="w-3 h-3 text-slate-400" />
                      Share visit summary
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN (~65%): Template Selector + Chart Writing Sections + Addendums */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Template Selector Dropdown */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="session-note-template-select"
                        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Note Template
                      </label>
                      {!isSigned && (
                        <button
                          type="button"
                          onClick={() => setShowTemplateBuilder(true)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Template</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <div className="relative flex-1 min-w-0">
                        <select
                          id="session-note-template-select"
                          disabled={isSigned}
                          value={currentSpec.id}
                          onChange={(e) => {
                            const chosen = templates.find((t) => t.id === e.target.value);
                            if (chosen) handleSelectTemplate(chosen);
                          }}
                          className={`w-full appearance-none pl-3 pr-9 py-2 text-sm font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors ${
                            isSigned ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:bg-white"
                          }`}
                        >
                          {templates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name} ({tpl.shortName} · {tpl.sections.length}{" "}
                              {tpl.sections.length === 1 ? "section" : "sections"})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      {currentSpec.description && (
                        <span
                          className="text-xs text-slate-400 truncate sm:max-w-[240px]"
                          title={currentSpec.description}
                        >
                          {currentSpec.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Structured Clinical Writing Sections */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                    <div className="space-y-1.5 pb-3 border-b border-slate-100">
                      <label className="text-xs font-semibold text-slate-700">Note Title *</label>
                      <input
                        type="text"
                        value={title}
                        disabled={isSigned}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Initial Consultation & Care Plan"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {currentSpec.name}
                      </h3>
                      <span className="text-[11px] text-slate-400">{currentSpec.description}</span>
                    </div>

                    {currentSpec.sections.map((sec) => {
                      const val = sections[sec.key] || "";
                      const inputType = sec.inputType || "textarea";
                      return (
                        <div key={sec.key} className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-800 block">
                            {sec.label}
                            {sec.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>

                          {inputType === "select" ? (
                            <select
                              disabled={isSigned}
                              value={val}
                              onChange={(e) => setSections((prev) => ({ ...prev, [sec.key]: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                            >
                              <option value="">Select an option...</option>
                              {(sec.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : inputType === "checkbox" ? (
                            <div className="flex flex-wrap gap-2 pt-0.5">
                              {(sec.options || []).map((opt) => {
                                const selectedList = val.split(",").map((x) => x.trim());
                                const checked = selectedList.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    disabled={isSigned}
                                    onClick={() => toggleCheckboxOption(sec.key, opt)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                      checked
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                    } ${isSigned ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          ) : inputType === "yes_no" ? (
                            <div className="flex items-center gap-2">
                              {["Yes", "No"].map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  disabled={isSigned}
                                  onClick={() => setSections((prev) => ({ ...prev, [sec.key]: choice }))}
                                  className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    val === choice
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  } ${isSigned ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                                >
                                  {choice}
                                </button>
                              ))}
                            </div>
                          ) : inputType === "text" ? (
                            <input
                              type="text"
                              disabled={isSigned}
                              value={val}
                              onChange={(e) => setSections((prev) => ({ ...prev, [sec.key]: e.target.value }))}
                              placeholder={sec.placeholder}
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                            />
                          ) : (
                            <textarea
                              rows={sec.rows || 4}
                              disabled={isSigned}
                              value={val}
                              onChange={(e) => setSections((prev) => ({ ...prev, [sec.key]: e.target.value }))}
                              placeholder={sec.placeholder}
                              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Signed Addendums */}
                  {isSigned && (
                    <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
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

                {/* RIGHT COLUMN (~35%): Encounter Details, AI Scribe, Vitals, EHR Sync */}
                <div className="lg:col-span-4 space-y-4">
                  {/* AI Scribe Card */}
                  {!isSigned && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          AI Scribe Assist
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowScribeRecorder(true)}
                        className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Dictate & Auto-Fill Sections</span>
                      </button>
                      {clientScribeSessions.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleApplyScribe(e.target.value);
                          }}
                          className="w-full px-2.5 py-2 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer focus:outline-none"
                        >
                          <option value="">Prefill from recording ({clientScribeSessions.length})...</option>
                          {clientScribeSessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title || s.extractedData?.diagnosis || "Consultation"} (
                              {new Date(s.sessionDate).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Encounter Metadata Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Encounter Details
                    </h3>

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

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Session Date & Time</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={sessionDate}
                        disabled={isSigned}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Duration (minutes)</span>
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={durationMinutes}
                        disabled={isSigned}
                        onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Vitals & Measurements */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowVitals((v) => !v)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                        <span>Vitals (Optional)</span>
                      </span>
                      {showVitals ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {showVitals && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5">
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

                  {/* External EHR Sync Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        External EHR Sync
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={isSyncingEhr}
                        onClick={() => handleManualEhrPush()}
                        className="text-xs font-semibold flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingEhr ? "animate-spin" : ""}`} />
                        <span>{connectedEhrs.length > 0 ? "Push to EHR" : "Test Push"}</span>
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {connectedEhrs.length > 0
                        ? `Auto-syncs on Sign & Lock to: ${connectedEhrs.map((t) => t.integrationName).join(", ")}.`
                        : "Connect an EHR (Cliniko, Healthie, Epic, Athena, Phorest) in Settings -> Integrations to push signed notes automatically."}
                    </p>

                    {ehrSyncRecords.length > 0 && (
                      <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                        {ehrSyncRecords.map((rec) => (
                          <div
                            key={`${rec.integrationId}-${rec.externalNoteId}`}
                            className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 gap-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-slate-800">{rec.integrationName}</span>
                              <span className="font-mono text-slate-500 truncate">{rec.externalNoteId}</span>
                            </div>
                            <span className="text-slate-400 font-mono shrink-0">
                              {new Date(rec.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
          setLinkedScribeId(newSession.id);
          toast.success("AI Scribe output applied to session note");
        }}
      />

      {/* Inline Custom Template Builder */}
      <NoteTemplateBuilderDrawer
        isOpen={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
        zIndex={zIndex + 50}
        onSaved={(newTpl) => {
          setTemplates(getNoteTemplates({ onlyEnabled: true }));
          setTemplateType(newTpl.id);
          if (newTpl.includeVitals) setShowVitals(true);
        }}
      />
    </>,
    document.body
  );
}
