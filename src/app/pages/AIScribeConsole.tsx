import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Clock,
  FileText,
  Download,
  Eye,
  Share2,
  Trash2,
  MoreVertical,
  GripVertical,
  Settings,
  Settings as SettingsIcon,
  Send,
  Sparkles,
  Copy,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction, TableBulkAction } from "../components/ui/TableComponent";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import {
  ScribeSession,
  getScribeSessions,
  deleteScribeSession,
  issuePrescriptionDocument,
  SCRIBE_EVENT,
} from "../../lib/scribeSessionStore";
import {
  NoteTemplate,
  NOTE_TEMPLATES_EVENT,
  getNoteTemplates,
  duplicateNoteTemplate,
  deleteNoteTemplate,
} from "../../lib/noteTemplatesStore";
import TranscriptDetailDrawer from "../components/scribe/TranscriptDetailDrawer";
import NewConsultationDrawer from "../components/scribe/NewConsultationDrawer";
import NoteTemplateBuilderDrawer from "../components/clinical/NoteTemplateBuilderDrawer";

export default function AIScribeConsole() {
  // Core Data Stores
  const [sessions, setSessions] = useState<ScribeSession[]>(getScribeSessions());
  const [consoleMode, setConsoleMode] = useState<"sessions" | "templates">("sessions");
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>(() => getNoteTemplates());
  const [templateSearch, setTemplateSearch] = useState("");
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);

  // Search & Filter
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // Table Selection & Kebab Dropdown
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  // Drawers State
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedDetailSession, setSelectedDetailSession] = useState<ScribeSession | null>(null);
  const [isNewConsultationOpen, setIsNewConsultationOpen] = useState(false);

  // WhatsApp Share Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppTargetSession, setWhatsAppTargetSession] = useState<ScribeSession | null>(null);

  // How It Works Modal
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Sync with store events
  useEffect(() => {
    const handleUpdate = () => {
      setSessions(getScribeSessions());
    };
    const handleTemplatesUpdate = () => {
      setNoteTemplates(getNoteTemplates());
    };
    window.addEventListener(SCRIBE_EVENT, handleUpdate);
    window.addEventListener(NOTE_TEMPLATES_EVENT, handleTemplatesUpdate);
    window.addEventListener("storage", handleTemplatesUpdate);
    return () => {
      window.removeEventListener(SCRIBE_EVENT, handleUpdate);
      window.removeEventListener(NOTE_TEMPLATES_EVENT, handleTemplatesUpdate);
      window.removeEventListener("storage", handleTemplatesUpdate);
    };
  }, []);

  // Close kebab menu on document click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".kebab-menu-container")) {
        setOpenMenuSessionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOpenDetailDrawer = (session: ScribeSession) => {
    setSelectedDetailSession(session);
    setIsDetailDrawerOpen(true);
  };

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteScribeSession(sessionId);
    setOpenMenuSessionId(null);
    toast.success("Transcript deleted");
  };

  // Pagination State (matching Clients.tsx)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Filtered Transcripts
  const filteredTranscripts = sessions.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      s.extractedData.diagnosis.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      s.transcript.fullText.toLowerCase().includes(transcriptSearch.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTranscripts.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredTranscripts.length);
  const paginatedTranscripts = filteredTranscripts.slice(startIndex, endIndex);

  const allSelected =
    paginatedTranscripts.length > 0 &&
    paginatedTranscripts.every((s) => selectedRows.has(s.id));
  const someSelected =
    paginatedTranscripts.some((s) => selectedRows.has(s.id)) && !allSelected;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(paginatedTranscripts.map((s) => s.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const getStatusBadge = (status?: string) => {
    if (status === "recording" || status === "transcribed") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          In Progress
        </span>
      );
    }
    if (status === "upcoming" || status === "scheduled") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Upcoming
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Completed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* ─── PageHeader (Clean and Unified) ─────────────────────────────────── */}
        <PageHeader
          title="AI Scribe"
          subtitle="Ambient clinical voice intelligence & prescription engine"
        >
          <div className="flex items-center gap-2.5">
            <HowItWorksButton
              onClick={() => setShowHowItWorksModal(true)}
              label="How Scribe Works"
            />
          </div>
        </PageHeader>

        {/* ─── Search & Action Bar powered by PageTopBar ─────────────────────── */}
        <PageTopBar
          isBottomPanelAttached={true}
          modes={[
            { id: "sessions", label: "Sessions" },
            { id: "templates", label: "Note Templates" },
          ]}
          activeMode={consoleMode}
          onModeChange={(m) => setConsoleMode(m as "sessions" | "templates")}
          searchQuery={consoleMode === "sessions" ? transcriptSearch : templateSearch}
          onSearchChange={(val) => {
            if (consoleMode === "sessions") {
              setTranscriptSearch(val);
              setCurrentPage(1);
            } else {
              setTemplateSearch(val);
            }
          }}
          searchPlaceholder={
            consoleMode === "sessions"
              ? "Search transcripts by patient name, keyword..."
              : "Search note templates by name, badge, or specialty..."
          }
          filterPresets={
            consoleMode === "sessions"
              ? [
                  { id: "all", label: "All Consultations", isActive: true, onClick: () => setTranscriptSearch("") },
                  { id: "completed", label: "Completed", onClick: () => setTranscriptSearch("completed") },
                  { id: "upcoming", label: "Upcoming", onClick: () => setTranscriptSearch("upcoming") },
                ]
              : undefined
          }
          filterFields={
            consoleMode === "sessions"
              ? [
                  {
                    id: "patient",
                    label: "Patient Name",
                    type: "text",
                    placeholder: "Filter by patient name...",
                    value: transcriptSearch,
                    onChange: (v) => setTranscriptSearch(v),
                  },
                  {
                    id: "status",
                    label: "Status",
                    type: "select",
                    options: ["All", "Completed", "Upcoming", "In Progress"],
                  },
                ]
              : undefined
          }
          availableFilterFieldsToAdd={
            consoleMode === "sessions" ? ["Session", "Provider", "Date", "Tags"] : undefined
          }
          primaryAction={
            consoleMode === "sessions"
              ? {
                  label: "Add Scribe",
                  onClick: () => setIsNewConsultationOpen(true),
                }
              : {
                  label: "New Template",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => {
                    setEditingTemplate(null);
                    setIsTemplateBuilderOpen(true);
                  },
                }
          }
        />

        {/* ─── Transcripts OR Note Templates Table ─────────────────── */}
        {consoleMode === "templates" ? (() => {
          const filteredTemplates = noteTemplates.filter((t) => {
            const q = templateSearch.toLowerCase().trim();
            if (!q) return true;
            return (
              t.name.toLowerCase().includes(q) ||
              t.shortName.toLowerCase().includes(q) ||
              t.category.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q)
            );
          });

          const templateColumns: TableColumn<NoteTemplate>[] = [
            {
              id: "name",
              header: "TEMPLATE NAME",
              align: "left",
              render: (tpl) => (
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-semibold shrink-0">
                    {tpl.shortName}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-slate-900 block truncate">
                      {tpl.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[260px]">
                      {tpl.description}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              id: "category",
              header: "CATEGORY",
              align: "left",
              render: (tpl) => (
                <span className="text-xs text-slate-700 font-medium">{tpl.category}</span>
              ),
            },
            {
              id: "sections",
              header: "SECTIONS",
              align: "center",
              render: (tpl) => (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-700">
                  {tpl.sections.length} blocks
                </span>
              ),
            },
            {
              id: "origin",
              header: "TYPE",
              align: "center",
              render: (tpl) =>
                tpl.isSystem ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    System Baseline
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Custom
                  </span>
                ),
            },
          ];

          const templateActions: TableRowAction<NoteTemplate>[] = [
            {
              label: "Edit Template",
              icon: <Edit2 className="w-3.5 h-3.5" />,
              onClick: (tpl) => {
                setEditingTemplate(tpl);
                setIsTemplateBuilderOpen(true);
              },
            },
            {
              label: "Duplicate",
              icon: <Copy className="w-3.5 h-3.5" />,
              onClick: (tpl) => {
                const copy = duplicateNoteTemplate(tpl.id);
                if (copy) {
                  setNoteTemplates(getNoteTemplates());
                  toast.success(`Duplicated "${tpl.name}"`);
                }
              },
            },
            {
              label: "Delete Template",
              icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
              isDanger: true,
              condition: (tpl) => !tpl.isSystem,
              onClick: (tpl) => {
                if (deleteNoteTemplate(tpl.id)) {
                  setNoteTemplates(getNoteTemplates());
                  toast.success(`Deleted "${tpl.name}"`);
                }
              },
            },
          ];

          return (
            <TableComponent
              data={filteredTemplates}
              columns={templateColumns}
              getRowId={(t) => t.id}
              rowActions={templateActions}
              onRowClick={(tpl) => {
                setEditingTemplate(tpl);
                setIsTemplateBuilderOpen(true);
              }}
              defaultRowsPerPage={15}
              emptyMessage="No Note Templates Found. Click '+ New Template' to create one."
            />
          );
        })() : (() => {
          const columns: TableColumn<ScribeSession>[] = [
            {
              id: "clientName",
              header: "NAME",
              align: "left",
              render: (s) => (
                <span
                  className="font-medium text-xs text-[#1A73E8] hover:underline cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  onClick={() => handleOpenDetailDrawer(s)}
                >
                  {s.clientName}
                </span>
              ),
            },
            {
              id: "workflow",
              header: "WORKFLOW",
              align: "left",
              render: (s) => {
                const titleStr =
                  s.title ||
                  `${s.clientName}_${s.entityType ? s.entityType.charAt(0).toUpperCase() + s.entityType.slice(1) : "Appointment"}_${(s.sessionDate || (s.createdAt ? new Date(s.createdAt).toISOString() : "2026-10-15")).slice(0, 10)}`;
                return (
                  <span
                    className="font-medium text-xs text-slate-800"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title={titleStr}
                  >
                    {titleStr}
                  </span>
                );
              },
            },
            {
              id: "duration",
              header: "DURATION",
              align: "center",
              render: (s) => (
                <span className="font-mono text-xs text-foreground">
                  {formatTime(s.durationSeconds)}
                </span>
              ),
            },
            {
              id: "responsible",
              header: "RESPONSIBLE",
              align: "left",
              render: (s) => (
                <span className="text-xs text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {s.doctorName || "Dr. Priya Sharma"}
                </span>
              ),
            },
            {
              id: "createdAt",
              header: "CREATED AT",
              align: "center",
              render: (s) => (
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {new Date(s.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              ),
            },
            {
              id: "status",
              header: "STATUS",
              align: "center",
              render: (s) => getStatusBadge(s.status),
            },
          ];

          const rowActions: TableRowAction<ScribeSession>[] = [
            {
              label: "View Transcript",
              icon: <Eye className="w-3.5 h-3.5 text-[#1A73E8]" />,
              onClick: (s) => handleOpenDetailDrawer(s),
            },
            {
              label: "Download PDF",
              icon: <Download className="w-3.5 h-3.5 text-[#1A73E8]" />,
              onClick: (s) => {
                issuePrescriptionDocument(s);
                toast.success(`Prescription downloaded for ${s.clientName}!`);
              },
            },
            {
              label: "Share via WhatsApp",
              icon: <Share2 className="w-3.5 h-3.5 text-emerald-600" />,
              onClick: (s) => {
                setWhatsAppTargetSession(s);
                setShowWhatsAppModal(true);
              },
            },
            {
              label: "Delete Record",
              icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
              isDanger: true,
              onClick: (s) => {
                deleteScribeSession(s.id);
                toast.success("Transcript deleted");
              },
            },
          ];

          const bulkActions: TableBulkAction[] = [
            {
              label: "Delete Selected",
              icon: <Trash2 className="w-3.5 h-3.5" />,
              variant: "danger",
              onClick: (ids) => {
                ids.forEach((id) => deleteScribeSession(String(id)));
                setSelectedRows(new Set());
                toast.success("Deleted selected transcripts");
              },
            },
          ];

          return (
            <TableComponent
              data={filteredTranscripts}
              columns={columns}
              getRowId={(s) => s.id}
              rowActions={rowActions}
              bulkActions={bulkActions}
              selectedIds={selectedRows}
              onSelectionChange={(ids) => setSelectedRows(new Set(Array.from(ids) as string[]))}
              onRowClick={(s) => handleOpenDetailDrawer(s)}
              defaultRowsPerPage={rowsPerPage}
              emptyMessage="No Transcripts Found. Click the + button above to record your first consultation."
            />
          );
        })()}

        {/* ─── NEW CONSULTATION / RECORDING DRAWER ─────────────────────────── */}
        <NewConsultationDrawer
          isOpen={isNewConsultationOpen}
          onClose={() => setIsNewConsultationOpen(false)}
          onSessionCreated={() => {
            setSessions(getScribeSessions());
          }}
          onViewTranscript={(newSession) => {
            setSessions(getScribeSessions());
            setIsNewConsultationOpen(false);
            setSelectedDetailSession(newSession);
            setIsDetailDrawerOpen(true);
          }}
        />

        {/* ─── TRANSCRIPT DETAIL INSPECTION DRAWER ─────────────────────────── */}
        <TranscriptDetailDrawer
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          session={selectedDetailSession}
          onOpenWhatsApp={(session) => {
            setWhatsAppTargetSession(session);
            setShowWhatsAppModal(true);
          }}
        />

        {/* ─── NOTE TEMPLATE BUILDER DRAWER ────────────────────────────────── */}
        <NoteTemplateBuilderDrawer
          isOpen={isTemplateBuilderOpen}
          onClose={() => {
            setIsTemplateBuilderOpen(false);
            setEditingTemplate(null);
          }}
          initialTemplate={editingTemplate}
          onSaved={() => setNoteTemplates(getNoteTemplates())}
        />

        {/* ─── WHATSAPP DIRECT SHARE MODAL ─────────────────────────────────── */}
        {showWhatsAppModal && whatsAppTargetSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-border">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <Share2 className="h-4 w-4 text-emerald-600" />
                  Send Prescription via WhatsApp
                </h3>
                <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="my-4 text-xs text-muted-foreground">
                <p className="mb-2">Dispatch digital prescription link to:</p>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-border font-mono text-xs font-bold text-foreground">
                  {whatsAppTargetSession.clientName}
                </div>
                <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-[11px] text-emerald-800 border border-emerald-200">
                  "Hello {whatsAppTargetSession.clientName}, your prescription from {whatsAppTargetSession.doctorName} for{" "}
                  {whatsAppTargetSession.extractedData.diagnosis} is ready to download: https://crm.mantracare.com/rx/doc89421"
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="rounded-lg px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    toast.success(`WhatsApp message sent to ${whatsAppTargetSession.clientName}!`);
                  }}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs flex items-center gap-1.5"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Send className="h-3.5 w-3.5" /> Send Message Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── HOW IT WORKS MODAL ─────────────────────────────────────────── */}
        <HowItWorksModal
          isOpen={showHowItWorksModal}
          onClose={() => setShowHowItWorksModal(false)}
          title="How AI Scribe Works"
          summary="MantraAssist AI Scribe uses ambient clinical speech recognition and intelligent entity extraction to turn doctor-patient conversations into structured EHR prescriptions and verified clinical notes in real time."
          bullets={[
            "Start a live consultation recording or upload existing encounter audio/notes.",
            "Deepgram Nova-2 Medical STT diarizes doctor vs. patient speech with high clinical accuracy.",
            "AI automatically extracts diagnosis, medications, dosages, symptoms, precautions, and vitals into 11 EHR sections.",
            "Customize the prescription layout by dragging & reordering sections or adding custom fields.",
            "Generate verified clinical prescription PDFs and dispatch them directly to patients via WhatsApp in 1 click.",
          ]}
          guideUrl="/guide/ai-scribe"
        />
      </div>
    </div>
  );
}
