import React, { useState } from "react";
import {
  FileText,
  Activity,
  HardDrive,
  Upload,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Camera,
  FileUp,
  Loader2,
  Inbox,
  ArrowRight,
  CheckCircle2,
  Link2,
} from "lucide-react";
import {
  abdmService,
  ABHAPatientRecord,
  M2Activity,
  UploadedRecord,
} from "../../../services/abdmService";
import { VitalsLabResultsWorkflow } from "../m3/VitalsLabResultsWorkflow";
import { MilestoneCard } from "../MilestoneCard";
import { MilestoneHero } from "../MilestoneHero";
import { LinkCareContextModal } from "./LinkCareContextModal";
import { DiscoverRecordsModal } from "./DiscoverRecordsModal";
import { ConsentManagementModal } from "./ConsentManagementModal";
import { ShareRecordsModal } from "./ShareRecordsModal";
import { toast } from "sonner";

export const M2Dashboard: React.FC = () => {
  const records = abdmService.getRecords();
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(
    records.length > 0 ? records[0] : null
  );

  // Active Central View: "overview" (default Action Bar) | "my_records" | "vitals_lab"
  const [activeM2View, setActiveM2View] = useState<
    "overview" | "my_records" | "vitals_lab"
  >("overview");

  // Activities & Uploaded records state
  const [activities, setActivities] = useState<M2Activity[]>(() =>
    abdmService.getActivities()
  );
  const [uploadedRecords, setUploadedRecords] = useState<UploadedRecord[]>(() =>
    abdmService.getUploadedRecords()
  );

  // My Records Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeChip, setSelectedTypeChip] = useState<string>("ALL");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDateRange, setFilterDateRange] = useState<string>("ALL");
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [activeMenuRecordId, setActiveMenuRecordId] = useState<string | null>(
    null
  );
  const [recordToDelete, setRecordToDelete] = useState<UploadedRecord | null>(
    null
  );

  // Background modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const patientName = selectedPatient?.name || "Jasmine";

  const refreshActivities = () => {
    setActivities(abdmService.getActivities());
    setUploadedRecords(abdmService.getUploadedRecords());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newRec: Omit<UploadedRecord, "id"> = {
      title: file.name.split(".")[0] || "Health Document",
      recordType: file.name.toLowerCase().includes("invoice")
        ? "Invoice"
        : file.name.toLowerCase().includes("lab")
        ? "Lab Report"
        : "Discharge Summary",
      dateFormatted: "-",
      dateRaw: "2026-09-08",
      monthGroup: "SEP 2026",
      tag: "No Tag added",
      status: "ANALYSING",
      previewUrl: URL.createObjectURL(file),
    };

    abdmService.addUploadedRecord(newRec);
    setUploadedRecords(abdmService.getUploadedRecords());
    setShowUploadDropdown(false);
    toast.success(`Uploaded "${file.name}" successfully!`);

    setTimeout(() => {
      const all = abdmService.getUploadedRecords();
      if (all.length > 0) {
        all[0].status = "READY";
        abdmService.saveUploadedRecords(all);
        setUploadedRecords([...all]);
      }
    }, 3000);
  };

  const handleTakePicture = () => {
    setShowUploadDropdown(false);
    toast.info("Opening camera capture interface...");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const newRec: Omit<UploadedRecord, "id"> = {
          title: "Captured Document",
          recordType: "Lab Report",
          dateFormatted: "08 Sep'26",
          dateRaw: "2026-09-08",
          monthGroup: "SEP 2026",
          tag: "No Tag added",
          status: "READY",
          previewUrl: URL.createObjectURL(file),
        };
        abdmService.addUploadedRecord(newRec);
        setUploadedRecords(abdmService.getUploadedRecords());
        toast.success("Document photo captured and saved!");
      }
    };
    input.click();
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    await abdmService.deleteUploadedRecord(recordToDelete.id);
    setUploadedRecords(abdmService.getUploadedRecords());
    setRecordToDelete(null);
    setActiveMenuRecordId(null);
    toast.success("Record deleted successfully");
  };

  // Dynamic Type counts
  const typeCounts = uploadedRecords.reduce((acc, curr) => {
    acc[curr.recordType] = (acc[curr.recordType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter logic for My Records
  const filteredRecords = uploadedRecords.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.recordType.toLowerCase().includes(q) ||
      (r.tag && r.tag.toLowerCase().includes(q));

    const matchesChip =
      selectedTypeChip === "ALL" || r.recordType === selectedTypeChip;

    const matchesFilterType =
      filterType === "ALL" || r.recordType === filterType;

    return matchesSearch && matchesChip && matchesFilterType;
  });

  const groupedRecords = filteredRecords.reduce((acc, curr) => {
    if (!acc[curr.monthGroup]) acc[curr.monthGroup] = [];
    acc[curr.monthGroup].push(curr);
    return acc;
  }, {} as Record<string, UploadedRecord[]>);

  const monthGroups = Object.keys(groupedRecords);

  return (
    <div className="space-y-6">
      {/* ── M2 Hero Header: Exact Style from Reference Screenshot 4 ── */}
      <MilestoneHero
        badge="MILESTONE 2 · LINK RECORDS"
        networkTag="HIP / HIE-CM Network"
        title="Link prescription & reports"
        description="After the consult, link the patient's prescription and reports to their ABHA."
      />

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── CENTRAL PROMINENT HORIZONTAL ACTION BAR ── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Option 1: My Records */}
        <div
          onClick={() => setActiveM2View("my_records")}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
            activeM2View === "my_records"
              ? "bg-white border-[#1456f0] shadow-md ring-2 ring-blue-500/20"
              : "bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300"
          }`}
        >
          <div className="space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                My Records
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                View and manage medical records, invoices, lab reports, and discharge summaries.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-[#1456f0] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
              <span>Open Records</span>
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
              {uploadedRecords.length} Stored Documents
            </span>
          </div>
        </div>

        {/* Option 2: Add Vitals & Lab Results */}
        <div
          onClick={() => setActiveM2View("vitals_lab")}
          className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
            activeM2View === "vitals_lab"
              ? "bg-white border-[#1456f0] shadow-md ring-2 ring-blue-500/20"
              : "bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300"
          }`}
        >
          <div className="space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Add Vitals & Lab Results
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Add and manage patient vitals, clinical calculators, and 17 diagnostic lab test categories.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs font-bold text-[#1456f0] flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
              <span>Add Vitals & Labs</span>
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Clinical Catalog Active
            </span>
          </div>
        </div>
      </div>



      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── DEDICATED VIEW 1: MY RECORDS EXPERIENCE ── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeM2View === "my_records" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div>
                <h3
                  className="text-xl font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  My Records
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Latest Document: 28 Jan'26
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUploadDropdown((prev) => !prev)}
                className="h-10 px-4 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Upload</span>
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[10px]">▼</span>
              </button>

              {showUploadDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in duration-150">
                  <label className="px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors">
                    <FileUp className="w-4 h-4 text-slate-500" />
                    <span>Upload file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                  </label>
                  <div
                    onClick={handleTakePicture}
                    className="px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Take picture</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search, Filter Chips & Filters Button */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search In Records"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1456f0] shadow-2xs transition-all font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setSelectedTypeChip("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                  selectedTypeChip === "ALL"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All ({uploadedRecords.length})
              </button>

              {Object.keys(typeCounts).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTypeChip(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                    selectedTypeChip === t
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t} ({typeCounts[t]})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFilterDrawer((prev) => !prev)}
              className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                filterType !== "ALL" || filterDateRange !== "ALL"
                  ? "border-[#1456f0] bg-blue-50 text-[#1456f0]"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-[#1456f0]" />
              <span>Filters</span>
            </button>
          </div>

          {/* Grouped Month Cards Grid */}
          {monthGroups.length > 0 ? (
            monthGroups.map((month) => (
              <div key={month} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-display">
                  {month}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {groupedRecords[month].map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-medium text-slate-500 block">
                            {rec.dateFormatted}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900 font-display mt-0.5">
                            {rec.title}
                          </h5>
                        </div>

                        {rec.status === "ANALYSING" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1456f0] border border-blue-200 text-[11px] font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Analysing...</span>
                          </div>
                        )}
                      </div>

                      <div className="w-full h-40 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 flex items-center justify-center">
                        {rec.previewUrl ? (
                          <img
                            src={rec.previewUrl}
                            alt={rec.title}
                            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-center text-slate-400 space-y-1">
                            <FileText className="w-8 h-8 mx-auto stroke-[1.5]" />
                            <span className="text-[11px] font-semibold block">
                              PDF Document
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-50 relative">
                        <span className="text-xs text-slate-400 font-medium">
                          {rec.tag || "No Tag added"}
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuRecordId(
                                activeMenuRecordId === rec.id ? null : rec.id
                              )
                            }
                            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuRecordId === rec.id && (
                            <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(rec)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-600">
                No medical records found.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── DEDICATED VIEW 2: ADD PAST VITALS & LAB RESULTS ── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeM2View === "vitals_lab" && (
        <VitalsLabResultsWorkflow
          patient={selectedPatient}
          onBack={() => {
            setActiveM2View("overview");
            setUploadedRecords(abdmService.getUploadedRecords());
          }}
        />
      )}

      {/* ── M2 Recent Activity Audit Timeline ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Recent Activity Audit
              </h3>
              <p className="text-[11px] text-slate-500">
                Consent, discovery, vitals and laboratory audit events
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Audit Verified
          </span>
        </div>

        {/* Stacked Tabular List Format */}
        <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
          {activities.map((act) => (
            <div
              key={act.id}
              className="py-3.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h5 className="font-bold text-slate-800 text-xs font-display truncate">
                    {act.title}
                  </h5>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {act.timestamp}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider self-start sm:self-auto sm:ml-4 flex-shrink-0 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-md">
                {act.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Record Confirmation Dialog */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setRecordToDelete(null)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 z-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 font-display">
                Delete Record?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete "{recordToDelete.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRecord}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LinkCareContextModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={refreshActivities}
      />
      <DiscoverRecordsModal
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
      />
      <ConsentManagementModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
      />
      <ShareRecordsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
