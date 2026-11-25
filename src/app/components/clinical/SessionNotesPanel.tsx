import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Lock,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import NewConsultationDrawer from "../scribe/NewConsultationDrawer";
import SessionNoteEditorDrawer from "./SessionNoteEditorDrawer";
import NoteTemplateBuilderDrawer from "./NoteTemplateBuilderDrawer";
import { getScribeSessions, ScribeSession, SCRIBE_EVENT } from "../../../lib/scribeSessionStore";
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
  SESSION_NOTES_EVENT,
  getSessionNotes,
  deleteSessionNote,
  syncExistingNoteToEhr,
  publishVisitSummaryToPatient,
} from "../../../lib/sessionNotesStore";

export interface SessionNotesPanelProps {
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
  compact?: boolean;
}

export default function SessionNotesPanel({
  client,
  appointment,
  processId,
  processName,
  compact = false,
}: SessionNotesPanelProps) {
  const [notes, setNotes] = useState<SessionNote[]>(() =>
    getSessionNotes({
      clientId: client?.id,
      clientName: client?.name,
      appointmentId: appointment?.id,
    })
  );
  const [templates, setTemplates] = useState<NoteTemplate[]>(() => getNoteTemplates({ onlyEnabled: true }));
  const [scribeSessions, setScribeSessions] = useState<ScribeSession[]>(() => getScribeSessions());
  const [ehrTargets, setEhrTargets] = useState<EhrSessionNotePushTarget[]>(() => getEhrSessionNoteTargets());

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "signed" | "draft">("all");
  const [templateFilter, setTemplateFilter] = useState<"all" | SessionNoteTemplateType>("all");
  const [syncingNoteId, setSyncingNoteId] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [prefillScribe, setPrefillScribe] = useState<ScribeSession | null>(null);
  const [showScribeModal, setShowScribeModal] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);

  const reloadNotes = () => {
    setNotes(
      getSessionNotes({
        clientId: client?.id,
        clientName: client?.name,
        appointmentId: appointment?.id,
      })
    );
  };

  useEffect(() => {
    reloadNotes();
  }, [client?.id, client?.name, appointment?.id]);

  useEffect(() => {
    const onNotesUpdated = () => reloadNotes();
    const onTemplatesUpdated = () => setTemplates(getNoteTemplates({ onlyEnabled: true }));
    const onScribeUpdated = () => setScribeSessions(getScribeSessions());
    const onIntegrationsUpdated = () => setEhrTargets(getEhrSessionNoteTargets());

    window.addEventListener(SESSION_NOTES_EVENT, onNotesUpdated);
    window.addEventListener(NOTE_TEMPLATES_EVENT, onTemplatesUpdated);
    window.addEventListener(SCRIBE_EVENT, onScribeUpdated);
    window.addEventListener("mantra:integration_updated", onIntegrationsUpdated);
    window.addEventListener("storage", onNotesUpdated);
    return () => {
      window.removeEventListener(SESSION_NOTES_EVENT, onNotesUpdated);
      window.removeEventListener(NOTE_TEMPLATES_EVENT, onTemplatesUpdated);
      window.removeEventListener(SCRIBE_EVENT, onScribeUpdated);
      window.removeEventListener("mantra:integration_updated", onIntegrationsUpdated);
      window.removeEventListener("storage", onNotesUpdated);
    };
  }, [client?.id, client?.name, appointment?.id]);

  const unlinkedScribeSessions = useMemo(() => {
    const linkedIds = new Set(notes.map((n) => n.scribeSessionId).filter(Boolean));
    const cid = String(client?.id || "").toLowerCase();
    const cname = (client?.name || "").trim().toLowerCase();
    return scribeSessions.filter((s) => {
      if (linkedIds.has(s.id)) return false;
      const matchesClient =
        (cid && String(s.clientId).toLowerCase() === cid) ||
        (cname && (s.clientName || "").trim().toLowerCase() === cname);
      if (!matchesClient) return false;
      if (appointment?.id) {
        return String(s.appointmentId || s.recordId || "") === String(appointment.id);
      }
      return true;
    });
  }, [scribeSessions, notes, client?.id, client?.name, appointment?.id]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((note) => {
      if (statusFilter !== "all" && note.status !== statusFilter) return false;
      if (templateFilter !== "all" && note.templateType !== templateFilter) return false;
      if (!q) return true;
      const sectionText = Object.values(note.sections || {}).join(" ").toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.providerName.toLowerCase().includes(q) ||
        note.templateType.toLowerCase().includes(q) ||
        (note.templateName && note.templateName.toLowerCase().includes(q)) ||
        sectionText.includes(q)
      );
    });
  }, [notes, statusFilter, templateFilter, searchQuery]);

  const connectedEhrs = ehrTargets.filter((t) => t.connected && t.sessionNotesEnabled);

  const handleOpenNew = (scribe?: ScribeSession) => {
    setEditingNote(null);
    setPrefillScribe(scribe || null);
    setIsEditorOpen(true);
  };

  const handleOpenExisting = (note: SessionNote) => {
    setEditingNote(note);
    setPrefillScribe(null);
    setIsEditorOpen(true);
  };

  const handleQuickPushEhr = async (note: SessionNote) => {
    setSyncingNoteId(note.id);
    try {
      const targetIds =
        connectedEhrs.length > 0
          ? connectedEhrs.map((t) => t.integrationId)
          : [ehrTargets[0]?.integrationId || "cliniko"];
      const { syncedNames } = await syncExistingNoteToEhr(note.id, targetIds);
      if (syncedNames.length > 0) {
        toast.success(`Synced note to ${syncedNames.join(", ")}`);
        reloadNotes();
      }
    } finally {
      setSyncingNoteId(null);
    }
  };

  const handleQuickShareSummary = (note: SessionNote) => {
    const updated = publishVisitSummaryToPatient(note.id);
    if (updated) {
      toast.success("After-Visit Summary shared to Client Documents & Patient Portal");
      reloadNotes();
    }
  };

  const handleDeleteDraft = (note: SessionNote) => {
    if (note.status === "signed") {
      toast.error("Signed notes are locked by EHR policy");
      return;
    }
    deleteSessionNote(note.id);
    toast.success("Draft session note deleted");
    reloadNotes();
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900">
              {appointment ? "Appointment Notes" : "Notes"}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {connectedEhrs.length > 0
              ? `Connected EHR sync: ${connectedEhrs.map((t) => t.integrationName).join(", ")}`
              : "Structured clinical charting with custom note templates and AI Scribe prefill."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateBuilder(true)}
            className="text-xs font-medium gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>New Template</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowScribeModal(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dictate with Scribe</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleOpenNew()}
            className="text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Unlinked AI Scribe Drafts Banner */}
      {unlinkedScribeSessions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <Sparkles className="w-4 h-4 text-slate-700 shrink-0" />
            <span>
              <span className="font-semibold">{unlinkedScribeSessions.length} AI Scribe recording</span> ready to convert into a structured note.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNew(unlinkedScribeSessions[0])}
            className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Convert Latest Scribe</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, sections, or clinician..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/70">
            {(["all", "signed", "draft"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-colors ${
                  statusFilter === st ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="all">All Templates</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Feed */}
      {filteredNotes.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed border-slate-200 rounded-xl space-y-2.5">
          <FileText className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            {notes.length === 0 ? "No notes recorded yet" : "No notes match your filter"}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Document structured clinical encounters, sign & lock notes, publish visit summaries, and sync with connected EHRs.
          </p>
          {notes.length === 0 && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenNew()}
                className="text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Note</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const spec = getNoteTemplateById(note.templateType);
            const isSigned = note.status === "signed";
            const visibleSections = spec.sections.filter(
              (s) => note.sections[s.key] && note.sections[s.key].trim().length > 0
            );

            return (
              <div
                key={note.id}
                onClick={() => handleOpenExisting(note)}
                className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer space-y-3"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-900 text-white">
                        {spec.shortName}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{note.title}</h4>
                      {isSigned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock className="w-3 h-3" />
                          Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Draft
                        </span>
                      )}
                      {note.addendums.length > 0 && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          +{note.addendums.length} addendum
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {note.providerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(note.sessionDate).toLocaleDateString()} ·{" "}
                        {new Date(note.sessionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {note.appointmentTitle && !appointment && (
                        <span className="text-slate-500 truncate max-w-[220px]">
                          Visit: {note.appointmentTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleQuickPushEhr(note)}
                      disabled={syncingNoteId === note.id}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Push note to EHR"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingNoteId === note.id ? "animate-spin" : ""}`} />
                      <span>EHR Sync</span>
                    </button>

                    {isSigned && !note.sharedToPatient && (
                      <button
                        type="button"
                        onClick={() => handleQuickShareSummary(note)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                        title="Share Visit Summary to Patient Portal"
                      >
                        <Send className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                    )}

                    {!isSigned && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(note)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Snippets Grid */}
                {visibleSections.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {visibleSections.slice(0, 4).map((sec) => (
                      <div
                        key={sec.key}
                        className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 space-y-0.5"
                      >
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          {sec.label}
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                          {note.sections[sec.key]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Patient Share & EHR Sync Footer Strip */}
                {(note.ehrSyncRecords.length > 0 || note.sharedToPatient) && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap text-[11px]">
                    {note.sharedToPatient && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Summary Shared
                      </span>
                    )}
                    {note.ehrSyncRecords.map((rec) => (
                      <span
                        key={rec.integrationId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono border border-emerald-200/70"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {rec.integrationName} · {rec.externalNoteId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Session Note Editor Drawer */}
      <SessionNoteEditorDrawer
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
          setPrefillScribe(null);
        }}
        client={client}
        appointment={appointment}
        processId={processId}
        processName={processName}
        initialNote={editingNote}
        initialScribeSession={prefillScribe}
        onSaved={() => reloadNotes()}
      />

      {/* AI Scribe Consultation Drawer */}
      <NewConsultationDrawer
        isOpen={showScribeModal}
        onClose={() => setShowScribeModal(false)}
        initialClientId={String(client.id)}
        initialClientName={client.name}
        initialEntityType={appointment?.id ? "appointment" : "client"}
        initialRecordId={appointment?.id ? String(appointment.id) : undefined}
        initialAppointmentId={appointment?.id ? String(appointment.id) : undefined}
        initialAttendeeName={appointment?.employeeName}
        zIndex={620}
        onSessionCreated={(newSession) => {
          setShowScribeModal(false);
          setScribeSessions(getScribeSessions());
          handleOpenNew(newSession);
        }}
      />

      {/* Inline Custom Template Builder */}
      <NoteTemplateBuilderDrawer
        isOpen={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
        onSaved={() => setTemplates(getNoteTemplates({ onlyEnabled: true }))}
      />
    </div>
  );
}
