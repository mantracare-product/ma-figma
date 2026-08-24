import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Stethoscope,
  User,
  Star,
  FileText,
  MessageSquare,
  Volume2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ScribeSession } from "../../../lib/scribeSessionStore";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";

export interface TranscriptDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: ScribeSession | null;
  onOpenWhatsApp?: (session: ScribeSession) => void;
}

const STORAGE_SECTIONS_KEY = "mantra_scribe_ehr_clean_titles_v5";

const DEFAULT_MEDICATION_FIELDS = [
  "med_name",
  "med_strength",
  "med_form",
  "med_dosage",
  "med_frequency",
  "med_duration",
  "med_route",
];

const DEFAULT_SCRIBE_SECTIONS: OverviewSection[] = [
  {
    id: "sec-patient-info",
    title: "Patient Information",
    description: "Demographics & consultation identifiers",
    iconName: "user",
    fieldKeys: ["patient_name", "patient_age_sex", "consultation_date", "patient_id"],
  },
  {
    id: "sec-chief-complaint",
    title: "Chief Complaint",
    description: "Reported symptoms & onset timeline",
    iconName: "tag",
    fieldKeys: ["symptoms", "complaint_duration"],
  },
  {
    id: "sec-diagnosis",
    title: "Diagnosis",
    description: "Primary assessment, ICD coding & examination findings",
    iconName: "sparkles",
    fieldKeys: ["primary_diagnosis", "icd_code", "diagnosis_type", "clinical_findings"],
  },
  {
    id: "sec-medication-1",
    title: "Medication 1",
    description: "Primary prescribed drug, dosage & route",
    iconName: "file-text",
    fieldKeys: [...DEFAULT_MEDICATION_FIELDS],
  },
  {
    id: "sec-medication-2",
    title: "Medication 2",
    description: "Secondary supportive drug, dosage & route",
    iconName: "file-text",
    fieldKeys: [...DEFAULT_MEDICATION_FIELDS],
  },
  {
    id: "sec-medication-3",
    title: "Medication 3",
    description: "Additional prescribed medication & route",
    iconName: "file-text",
    fieldKeys: [...DEFAULT_MEDICATION_FIELDS],
  },
  {
    id: "sec-instructions",
    title: "Instructions",
    description: "Medication administration & daily living advice",
    iconName: "workflow",
    fieldKeys: ["patient_instructions"],
  },
  {
    id: "sec-precautions",
    title: "Precautions",
    description: "Activity limits, allergy warnings & red-flag triggers",
    iconName: "shield",
    fieldKeys: ["patient_precautions"],
  },
  {
    id: "sec-prognosis",
    title: "Prognosis",
    description: "Expected clinical course & complication risk",
    iconName: "layers",
    fieldKeys: ["prognosis_status", "expected_course", "complication_risk"],
  },
  {
    id: "sec-followup",
    title: "Follow-up",
    description: "Recall review schedule & trigger conditions",
    iconName: "settings",
    fieldKeys: ["follow_up_review", "follow_up_criteria"],
  },
  {
    id: "sec-doctor-info",
    title: "Doctor Information",
    description: "Attending physician credentials & signature date",
    iconName: "briefcase",
    fieldKeys: ["doctor_name", "doctor_qualification", "registration_no", "doctor_signature_date"],
  },
];

export default function TranscriptDetailDrawer({
  isOpen,
  onClose,
  session,
}: TranscriptDetailDrawerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSec, setPlaybackSec] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const timerRef = useRef<any>(null);

  // Sections State (Separate Medication 1, Medication 2, Medication 3 sections with common fields)
  const [sections, setSections] = useState<OverviewSection[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 8) return parsed;
      }
    } catch {}
    return DEFAULT_SCRIBE_SECTIONS;
  });

  // Re-sync sections on opening to ensure full section structure
  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(STORAGE_SECTIONS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            setSections(parsed);
            return;
          }
        }
      } catch {}
      setSections(DEFAULT_SCRIBE_SECTIONS);
    }
  }, [isOpen]);

  // Dynamic Field Values State (Prefilled from session transcript)
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Sync field values from session when opened
  useEffect(() => {
    if (!session) return;
    const d: any = session.extractedData || {};

    // Parse dynamic symptoms array from transcript data
    let extractedSymptoms: string[] = [];
    if (d.chiefComplaint) {
      const parts = d.chiefComplaint
        .split(/[,;\n•]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 1);
      if (parts.length > 0) {
        extractedSymptoms = parts;
      }
    }
    if (extractedSymptoms.length === 0) {
      extractedSymptoms = [
        "Fever",
        "Sore throat",
        "Dry cough",
      ];
    }

    const sessionDate = new Date(session.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const initialValues: Record<string, any> = {
      // 1. Patient Information
      patient_name: session.clientName || "Rahul Sharma",
      patient_age_sex: `${session.patientAge || 32} years / ${session.patientGender || "Male"}`,
      consultation_date: sessionDate,
      patient_id: `PT-${Math.floor(10000 + Math.random() * 90000)}`,

      // 2. Chief Complaint
      symptoms: extractedSymptoms,
      complaint_duration: "Symptoms for 3 days",

      // 3. Diagnosis
      primary_diagnosis: d.diagnosis || "Acute upper respiratory tract infection",
      icd_code: "J06.9",
      diagnosis_type: "Acute",
      clinical_findings: "Mild fever, congested throat, no breathing difficulty. Bilateral air entry clear.",

      // 4. Medication 1 (Common Field Keys scoped to section)
      "sec-medication-1_med_name": d.medications?.[0]?.drugName || "Paracetamol",
      "sec-medication-1_med_strength": d.medications?.[0]?.dosage || "500 mg",
      "sec-medication-1_med_form": "Tablet",
      "sec-medication-1_med_dosage": "1 tablet",
      "sec-medication-1_med_frequency": d.medications?.[0]?.frequency || "Up to 3 times/day as needed",
      "sec-medication-1_med_duration": d.medications?.[0]?.duration || "3 days",
      "sec-medication-1_med_route": "Oral",

      // 5. Medication 2 (Common Field Keys scoped to section)
      "sec-medication-2_med_name": d.medications?.[1]?.drugName || "Cetirizine",
      "sec-medication-2_med_strength": d.medications?.[1]?.dosage || "10 mg",
      "sec-medication-2_med_form": "Tablet",
      "sec-medication-2_med_dosage": "1 tablet",
      "sec-medication-2_med_frequency": d.medications?.[1]?.frequency || "Once daily (OD)",
      "sec-medication-2_med_duration": d.medications?.[1]?.duration || "5 days",
      "sec-medication-2_med_route": "Oral",

      // 6. Medication 3 (Common Field Keys scoped to section)
      "sec-medication-3_med_name": d.medications?.[2]?.drugName || "Cough syrup",
      "sec-medication-3_med_strength": d.medications?.[2]?.dosage || "Standard",
      "sec-medication-3_med_form": "Syrup",
      "sec-medication-3_med_dosage": "5 mL",
      "sec-medication-3_med_frequency": d.medications?.[2]?.frequency || "3 times/day (TDS)",
      "sec-medication-3_med_duration": d.medications?.[2]?.duration || "5 days",
      "sec-medication-3_med_route": "Oral",

      // Fallbacks
      med_name: d.medications?.[0]?.drugName || "Paracetamol",
      med_strength: d.medications?.[0]?.dosage || "500 mg",
      med_form: "Tablet",
      med_dosage: "1 tablet",
      med_frequency: "Up to 3 times/day as needed",
      med_duration: "3 days",
      med_route: "Oral",

      // 7. Instructions (List Array)
      patient_instructions: [
        "Take medicines as prescribed",
        "Take tablets after meals where applicable",
        "Maintain adequate fluid intake",
        "Get adequate rest",
        "Do not exceed the prescribed dosage",
      ],

      // 8. Precautions (List Array)
      patient_precautions: [
        "Avoid driving if the medication causes drowsiness",
        "Avoid taking other medicines containing paracetamol simultaneously",
        "Inform the doctor about any known drug allergies",
        "Seek medical attention if breathing difficulty or persistent high fever develops",
      ],

      // 9. Prognosis
      prognosis_status: "Good",
      expected_course: "Symptoms expected to improve within 5–7 days.",
      complication_risk: "Low",

      // 10. Follow-up
      follow_up_review: d.followUpDate
        ? `Review after: ${d.followUpDays || 5}–7 days (${d.followUpDate}) or earlier if symptoms worsen.`
        : "Review after: 5–7 days or earlier if symptoms worsen.",
      follow_up_criteria: "If symptoms worsen or do not improve within 5 days.",

      // 11. Doctor Information
      doctor_name: session.doctorName || "Dr. Ankit Mehra",
      doctor_qualification: "MBBS, MD",
      registration_no: "MCI-482910",
      doctor_signature_date: sessionDate,
    };

    setFieldValues(initialValues);
  }, [session]);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setPlaybackSec(0);
      setPlaybackSpeed(1);
      setRating(0);
      setHoverRating(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isPlaying && session) {
      timerRef.current = setInterval(() => {
        setPlaybackSec((prev) => {
          if (prev >= session.durationSeconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, session, playbackSpeed]);

  if (!isOpen || !session) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    setSections(newSections);
    try {
      localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify(newSections));
    } catch {}
  };

  const handleFieldValueChange = (key: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Generate a clean narrative summary from extractedData
  const getClinicalSummary = () => {
    const d: any = session.extractedData || {};
    const medsText =
      d.medications && d.medications.length > 0
        ? d.medications.map((m: any) => `${m.drugName} (${m.dosage}, ${m.frequency})`).join(", ")
        : "Standard supportive care";

    return `${session.clientName}, a ${session.patientAge || 54}-year-old ${session.patientGender || "patient"}, had a clinical consultation with ${session.doctorName}. Chief complaint presented was "${d.chiefComplaint || "Visual impairment"}". Following examination and dialogue evaluation, the primary diagnosis was established as ${d.diagnosis || "Nuclear Cataract"}. The prescribed treatment plan includes ${medsText}. Additional investigations: ${d.investigations?.join(", ") || "Visual Acuity"}. Follow-up review is scheduled for ${d.followUpDate || "14 days"}.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-5xl bg-[#f8fafc] shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-border"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
          <h2
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Conversation with {session.clientName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ─── LEFT COLUMN: CLINICAL EHR SECTIONS (5 cols) ─────────────── */}
            <div className="lg:col-span-5 space-y-4 pb-12">
              {/* Interactive Draggable Overview Sections Component */}
              <DraggableOverviewSections
                mode="scribe"
                customFieldsModule="scribe"
                sections={sections}
                onSectionsChange={handleSectionsChange}
                fieldValues={fieldValues}
                onFieldValueChange={handleFieldValueChange}
                onSaveChanges={() => {
                  toast.success("Prescription & EHR notes saved!");
                }}
              />
            </div>

            {/* ─── RIGHT COLUMN: RECORDING + SUMMARY + TRANSCRIPTION (7 cols) ─ */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Recording Card */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <Volume2 className="w-4 h-4 text-[#181e25]" />
                    <span>Recording</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    , {new Date(session.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Player Row */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-[#181e25] hover:bg-[#2c3e50] text-white flex items-center justify-center transition-all flex-shrink-0 shadow-xs cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div
                        className="h-2 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          setPlaybackSec(Math.floor(pos * session.durationSeconds));
                        }}
                      >
                        <div
                          className="h-full bg-[#181e25] transition-all duration-150"
                          style={{
                            width: `${Math.min(
                              100,
                              (playbackSec / (session.durationSeconds || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{formatTime(playbackSec)}</span>
                        <span>{formatTime(session.durationSeconds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Speed Controls & Star Rating */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-border">
                      {[1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all cursor-pointer ${
                            playbackSpeed === s
                              ? "bg-white text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110 p-0.5 cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              (hoverRating || rating) >= i
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. AI Summary Card */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <FileText className="w-4 h-4 text-[#181e25]" />
                  <span>Summary</span>
                </div>
                <p
                  className="text-xs text-[#475569] leading-relaxed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {getClinicalSummary()}
                </p>
              </div>

              {/* 3. Transcription Speech Timeline (Sticky when scrolled into view) */}
              <div className="rounded-2xl bg-white p-5 border border-border shadow-xs flex flex-col sticky top-0 z-10 max-h-[calc(100vh-140px)]">
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <MessageSquare className="w-4 h-4 text-[#181e25]" />
                    <span>Transcription</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-muted-foreground font-mono">
                    {session.transcript.utterances.length} Messages
                  </span>
                </div>

                {/* Speech Turns Timeline */}
                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                  {session.transcript.utterances.map((u) => {
                    const isDoctor = u.speaker === "doctor";

                    if (isDoctor) {
                      return (
                        <div key={u.id} className="flex flex-col items-end space-y-1">
                          <span
                            className="text-[11px] font-medium text-muted-foreground mr-10"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            Doctor
                          </span>
                          <div className="flex items-start gap-2.5 max-w-[88%]">
                            <div className="rounded-2xl rounded-tr-xs bg-white border border-border p-3.5 shadow-2xs">
                              <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {u.text}
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#181e25] mt-0.5">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={u.id} className="flex flex-col items-start space-y-1">
                        <span
                          className="text-[11px] font-medium text-muted-foreground ml-10"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Patient
                        </span>
                        <div className="flex items-start gap-2.5 max-w-[88%]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-100 p-3.5">
                            <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {u.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
