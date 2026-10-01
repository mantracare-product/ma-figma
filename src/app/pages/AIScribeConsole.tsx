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
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
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
import TranscriptDetailDrawer from "../components/scribe/TranscriptDetailDrawer";
import NewConsultationDrawer from "../components/scribe/NewConsultationDrawer";

export default function AIScribeConsole() {
  // Core Data Stores
  const [sessions, setSessions] = useState<ScribeSession[]>(getScribeSessions());

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
    window.addEventListener(SCRIBE_EVENT, handleUpdate);
    return () => window.removeEventListener(SCRIBE_EVENT, handleUpdate);
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

        {/* ─── Search & Action Bar ───────────────────────────────────────────── */}
        <div className="bg-card rounded-t-xl p-2.5 px-3 border border-border shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search transcripts by patient name, keyword..."
                value={transcriptSearch}
                onChange={(e) => {
                  setTranscriptSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-[36px] bg-input-background border border-input rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Button to Add Scribe / Open Drawer */}
            <button
              type="button"
              onClick={() => setIsNewConsultationOpen(true)}
              className="h-[36px] px-3.5 bg-[#1E293B] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Scribe</span>
            </button>
          </div>
        </div>

        {/* ─── Transcripts Table with Dark Thead ─────────────────────── */}
        <div className="bg-white rounded-b-xl border border-t-0 border-border shadow-xs overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead className="bg-[#1E293B] text-white">
                <tr className="h-[34px]">
                  {/* Checkbox Column */}
                  <th className="px-3 py-1.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                    />
                  </th>

                  {/* Settings Column Header */}
                  <th className="px-1 py-1.5 text-center w-8">
                    <SettingsIcon className="w-3.5 h-3.5 text-[#E5E7EB] mx-auto opacity-70" />
                  </th>

                  {/* NAME */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    NAME
                  </th>

                  {/* SESSION */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    SESSION
                  </th>

                  {/* DURATION */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    DURATION
                  </th>

                  {/* RESPONSIBLE */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    RESPONSIBLE
                  </th>

                  {/* CREATED AT */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    CREATED AT
                  </th>

                  {/* STATUS */}
                  <th
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border text-xs">
                {paginatedTranscripts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                        No Transcripts Found
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Click the <strong className="text-[#1A73E8]">+</strong> button above to record your first consultation.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedTranscripts.map((s) => (
                    <tr
                      key={s.id}
                      className={`h-[32px] transition-colors cursor-pointer ${
                        selectedRows.has(s.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"
                      }`}
                      onClick={() => handleOpenDetailDrawer(s)}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(s.id)}
                          onChange={() => handleSelectRow(s.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                        />
                      </td>

                      {/* Hamburger / Kebab Menu with Dropdown in front of name */}
                      <td className="px-1 py-1 text-center relative kebab-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuSessionId(openMenuSessionId === s.id ? null : s.id)}
                          className="p-1 hover:bg-muted rounded transition-colors inline-flex items-center justify-center"
                          style={{ width: "24px", height: "24px" }}
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>

                        {openMenuSessionId === s.id && (
                          <div
                            className="absolute left-8 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 border border-border py-1 text-left"
                            style={{
                              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                              minWidth: "180px",
                            }}
                          >
                            <button
                              onClick={() => {
                                setOpenMenuSessionId(null);
                                handleOpenDetailDrawer(s);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2.5 text-foreground transition-colors"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Eye className="w-3.5 h-3.5 text-[#1A73E8]" /> View Transcript
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuSessionId(null);
                                issuePrescriptionDocument(s);
                                toast.success(`Prescription downloaded for ${s.clientName}!`);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2.5 text-foreground transition-colors"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Download className="w-3.5 h-3.5 text-[#1A73E8]" /> Download PDF
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuSessionId(null);
                                setWhatsAppTargetSession(s);
                                setShowWhatsAppModal(true);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center gap-2.5 text-emerald-700 transition-colors"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600" /> Share via WhatsApp
                            </button>

                            <div className="border-t border-border my-1" />

                            <button
                              onClick={(e) => handleDelete(s.id, e)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2.5 text-red-600 transition-colors"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Record
                            </button>
                          </div>
                        )}
                      </td>

                      {/* NAME */}
                      <td className="px-3 py-1">
                        <span
                          className="font-medium text-xs text-[#1A73E8] hover:underline cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {s.clientName}
                        </span>
                      </td>

                      {/* SESSION */}
                      <td className="px-3 py-1 text-xs text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {s.appointmentId && s.appointmentId !== "none"
                          ? new Date(s.sessionDate || s.createdAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : (s.sessionDate
                              ? new Date(s.sessionDate).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—")}
                      </td>

                      {/* DURATION */}
                      <td className="px-3 py-1 font-mono text-xs text-foreground">
                        {formatTime(s.durationSeconds)}
                      </td>

                      {/* RESPONSIBLE */}
                      <td className="px-3 py-1 text-xs text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {s.doctorName || "Dr. Priya Sharma"}
                      </td>

                      {/* LAST CONTACT / DATE */}
                      <td className="px-3 py-1 text-xs text-muted-foreground">
                        <span style={{ fontFamily: "Outfit, sans-serif" }}>
                          {new Date(s.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-3 py-1">
                        {getStatusBadge(s.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Standard Pagination Footer (matching Clients.tsx) */}
          <div className="px-4 py-2 border-t border-border bg-white flex items-center justify-between text-xs text-muted-foreground select-none">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-input rounded px-2 py-0.5 bg-input-background text-xs cursor-pointer focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2">
                Showing {filteredTranscripts.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredTranscripts.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="First page"
              >
                <span className="text-xs">«</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <span className="text-xs">‹</span>
              </button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <span className="text-xs">›</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Last page"
              >
                <span className="text-xs">»</span>
              </button>
            </div>
          </div>
        </div>

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
