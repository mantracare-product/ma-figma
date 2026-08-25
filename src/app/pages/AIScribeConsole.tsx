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

  // Filtered Transcripts
  const filteredTranscripts = sessions.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      s.extractedData.diagnosis.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      s.transcript.fullText.toLowerCase().includes(transcriptSearch.toLowerCase());

    return matchesSearch;
  });

  const allSelected =
    filteredTranscripts.length > 0 &&
    filteredTranscripts.every((s) => selectedRows.has(s.id));
  const someSelected =
    filteredTranscripts.some((s) => selectedRows.has(s.id)) && !allSelected;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredTranscripts.map((s) => s.id)));
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
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          In Progress
        </span>
      );
    }
    if (status === "upcoming" || status === "scheduled") {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Upcoming
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Completed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-5">
        {/* ─── PageHeader (Clean and Unified) ─────────────────────────────────── */}
        <PageHeader
          title="AI Scribe"
          subtitle="Ambient clinical voice intelligence & prescription engine"
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live STT
            </span>
          }
        >
          <div className="flex items-center gap-2.5">
            <HowItWorksButton
              onClick={() => setShowHowItWorksModal(true)}
              label="How Scribe Works"
            />
          </div>
        </PageHeader>

        {/* ─── Search & Action Bar ───────────────────────────────────────────── */}
        <div className="bg-card rounded-t-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative search-bar-container">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                <div className="w-full h-[44px] bg-input-background border border-input rounded-xl flex items-center pl-10 pr-3">
                  <input
                    type="text"
                    placeholder="Search transcripts by patient name, keyword..."
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground h-full"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                  {transcriptSearch && (
                    <button
                      onClick={() => setTranscriptSearch("")}
                      className="text-xs text-muted-foreground hover:text-foreground px-2"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Capsule Button to Add Scribe / Open Drawer */}
            <Button
              variant="primary"
              onClick={() => setIsNewConsultationOpen(true)}
              className="h-[44px] px-5 rounded-full whitespace-nowrap flex items-center gap-2 text-xs font-semibold shadow-xs"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Scribe</span>
            </Button>
          </div>
        </div>

        {/* ─── Transcripts Table with Dark Gradient Thead ─────────────────────── */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                <tr>
                  {/* Checkbox Column */}
                  <th className="px-4 py-2.5 w-10">
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

                  {/* Hamburger Menu Column Header */}
                  <th className="px-2 py-2.5 text-center w-8">
                    <SettingsIcon className="w-4 h-4 text-[#E5E7EB] mx-auto opacity-70" />
                  </th>

                  {/* NAME */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      NAME
                    </div>
                  </th>

                  {/* SESSION */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      SESSION
                    </div>
                  </th>

                  {/* DURATION */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      DURATION
                    </div>
                  </th>

                  {/* RESPONSIBLE */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      RESPONSIBLE
                    </div>
                  </th>

                  {/* CREATED AT */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      CREATED AT
                    </div>
                  </th>

                  {/* STATUS */}
                  <th
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 opacity-50" />
                      STATUS
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredTranscripts.length === 0 ? (
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
                  filteredTranscripts.map((s) => (
                    <tr
                      key={s.id}
                      className={`transition-colors cursor-pointer ${
                        selectedRows.has(s.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"
                      }`}
                      onClick={() => handleOpenDetailDrawer(s)}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(s.id)}
                          onChange={() => handleSelectRow(s.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                        />
                      </td>

                      {/* Hamburger / Kebab Menu with Dropdown in front of name */}
                      <td className="px-2 py-3 relative kebab-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuSessionId(openMenuSessionId === s.id ? null : s.id)}
                          className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                          style={{ width: "24px", height: "24px" }}
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {openMenuSessionId === s.id && (
                          <div
                            className="absolute left-8 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 border border-border py-1"
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

                      {/* NAME (Clean without subtext) */}
                      <td className="px-4 py-3">
                        <span
                          className="font-medium text-sm text-[#1A73E8] hover:underline cursor-pointer"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {s.clientName}
                        </span>
                      </td>

                      {/* SESSION (Only date of the selected session) */}
                      <td className="px-4 py-3 text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
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

                      {/* DURATION (Clean without subtext) */}
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {formatTime(s.durationSeconds)}
                      </td>

                      {/* RESPONSIBLE (Doctor / Staff) */}
                      <td className="px-4 py-3 text-xs text-foreground font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {s.doctorName || "Dr. Priya Sharma"}
                      </td>

                      {/* LAST CONTACT / DATE (Clean without subtext) */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span style={{ fontFamily: "Outfit, sans-serif" }}>
                          {new Date(s.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* STATUS (Completed / Upcoming / In Progress) */}
                      <td className="px-4 py-3">
                        {getStatusBadge(s.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-border bg-slate-50/60 flex items-center justify-between text-xs text-muted-foreground">
            <span style={{ fontFamily: "Outfit, sans-serif" }}>
              Showing <strong>{filteredTranscripts.length}</strong> transcripts • Click any row or the menu icon to inspect
            </span>
            <span className="font-mono text-[11px]">Deepgram Nova-2 Medical STT</span>
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
