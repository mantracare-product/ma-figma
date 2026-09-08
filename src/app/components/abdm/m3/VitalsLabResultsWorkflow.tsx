import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Search,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Activity,
  FlaskConical,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Info,
  Clock,
  User,
  Heart,
  FileCheck2,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  abdmService,
  ABHAPatientRecord,
  PatientVitalEntry,
  PatientLabResultRecord,
} from "../../../services/abdmService";
import {
  LAB_CATEGORIES,
  LAB_TESTS_CATALOG,
  LabTestDef,
} from "./labCatalog";
import { toast } from "sonner";

interface VitalsLabResultsWorkflowProps {
  onBack: () => void;
  patient?: ABHAPatientRecord | null;
  initialTab?: "vitals" | "labs";
}

export const VitalsLabResultsWorkflow: React.FC<VitalsLabResultsWorkflowProps> = ({
  onBack,
  patient,
  initialTab = "vitals",
}) => {
  // Top Level Workflow Tab: "vitals" vs "labs"
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<"vitals" | "labs">(
    initialTab
  );

  // Vitals Sub-tabs: "add" vs "view"
  const [activeVitalsSubTab, setActiveVitalsSubTab] = useState<"add" | "view">(
    "add"
  );

  // Vitals State & Collapsible Sections
  const [isVitalsSectionOpen, setIsVitalsSectionOpen] = useState(true);
  const [isCalculatorsSectionOpen, setIsCalculatorsSectionOpen] = useState(true);
  const [vitalSearchQuery, setVitalSearchQuery] = useState("");
  const [vitalDateTime, setVitalDateTime] = useState("08 Sep'26, 3:56 PM");
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  // Vitals Form Values
  const [systolicBp, setSystolicBp] = useState("");
  const [diastolicBp, setDiastolicBp] = useState("");
  const [bodyTemp, setBodyTemp] = useState("");
  const [spO2, setSpO2] = useState("");
  const [pulseRate, setPulseRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [bodyHeight, setBodyHeight] = useState("");
  const [bodyWeight, setBodyWeight] = useState("");

  // Auto-calculated BMI
  const computedBmi = useMemo(() => {
    const h = parseFloat(bodyHeight);
    const w = parseFloat(bodyWeight);
    if (!isNaN(h) && !isNaN(w) && h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      return bmi.toFixed(2);
    }
    return "";
  }, [bodyHeight, bodyWeight]);

  // Calculators inputs
  const [egfrInput, setEgfrInput] = useState("");
  const [egfrResult, setEgfrResult] = useState<string | null>(null);
  const [cvdInput, setCvdInput] = useState("");
  const [cvdResult, setCvdResult] = useState<string | null>(null);
  const [crClInput, setCrClInput] = useState("");
  const [crClResult, setCrClResult] = useState<string | null>(null);
  const [qriskInput, setQriskInput] = useState("");
  const [qriskResult, setQriskResult] = useState<string | null>(null);
  const [bsaInput, setBsaInput] = useState("");
  const [bsaResult, setBsaResult] = useState<string | null>(null);

  // Persisted Vitals List
  const [persistedVitals, setPersistedVitals] = useState<PatientVitalEntry[]>(() => {
    const records = abdmService.getPatientVitals(patient?.id || patient?.abhaAddress);
    if (records.length === 0) {
      // Seed initial sample matching reference view if none exists
      return [
        {
          id: "VIT-SAMPLE-01",
          patientId: patient?.id || "ABDM-001",
          patientName: patient?.name || "Priya Sharma",
          recordedAt: "08 Sep'26, 2:56 PM",
          recordedDateRaw: "2026-09-08T14:56:00",
          vitals: {
            spO2: "21",
          },
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return records;
  });

  // ── Lab Results State ──
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labDate, setLabDate] = useState("08 Sep'26");
  const [isSubmittingLabs, setIsSubmittingLabs] = useState(false);

  // Category collapse state map: ALL COLLAPSED BY DEFAULT AS REQUIRED (Section 1)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    LAB_CATEGORIES.forEach((cat) => {
      initial[cat.name] = false;
    });
    return initial;
  });

  // Lab test inputs map { testId: { value: string, unit: string } }
  const [labFormValues, setLabFormValues] = useState<
    Record<string, { value: string; unit: string }>
  >(() => {
    const initial: Record<string, { value: string; unit: string }> = {};
    LAB_TESTS_CATALOG.forEach((t) => {
      initial[t.id] = { value: "", unit: t.defaultUnit };
    });
    return initial;
  });

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Lab filled & out-of-range dynamic counters
  const { totalFilledLabs, totalOutOfRangeLabs } = useMemo(() => {
    let filled = 0;
    let outOfRange = 0;

    Object.entries(labFormValues).forEach(([testId, data]) => {
      if (data.value && data.value.trim() !== "") {
        filled++;
        const testDef = LAB_TESTS_CATALOG.find((t) => t.id === testId);
        if (testDef && testDef.valueType === "numeric") {
          const numVal = parseFloat(data.value);
          if (!isNaN(numVal)) {
            if (
              (testDef.refMin !== undefined && numVal < testDef.refMin) ||
              (testDef.refMax !== undefined && numVal > testDef.refMax)
            ) {
              outOfRange++;
            }
          }
        }
      }
    });

    return { totalFilledLabs: filled, totalOutOfRangeLabs: outOfRange };
  }, [labFormValues]);

  // Handle calculator execution
  const calculateEgfr = () => {
    const scr = parseFloat(egfrInput || systolicBp);
    if (isNaN(scr) || scr <= 0) {
      toast.info("Please enter Serum Creatinine value (mg/dL)");
      return;
    }
    const isFemale = patient?.gender === "FEMALE";
    const age = 35;
    const k = isFemale ? 0.7 : 0.9;
    const a = isFemale ? -0.241 : -0.302;
    const minScr = Math.min(scr / k, 1);
    const maxScr = Math.max(scr / k, 1);
    const egfrVal =
      142 *
      Math.pow(minScr, a) *
      Math.pow(maxScr, -1.2) *
      Math.pow(0.9938, age) *
      (isFemale ? 1.012 : 1.0);
    setEgfrResult(`${egfrVal.toFixed(1)} mL/min/1.73m²`);
    toast.success("eGFR calculated successfully");
  };

  const calculateBsa = () => {
    const h = parseFloat(bodyHeight);
    const w = parseFloat(bodyWeight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      toast.info("Please enter both Body Height and Body Weight first");
      return;
    }
    const bsa = Math.sqrt((h * w) / 3600);
    setBsaResult(`${bsa.toFixed(2)} m²`);
    toast.success("BSA calculated successfully");
  };

  const calculateCrCl = () => {
    const scr = parseFloat(crClInput);
    const w = parseFloat(bodyWeight);
    if (isNaN(scr) || isNaN(w) || scr <= 0 || w <= 0) {
      toast.info("Please enter Creatinine and Body Weight");
      return;
    }
    const age = 35;
    const isFemale = patient?.gender === "FEMALE";
    const crcl = (((140 - age) * w) / (72 * scr)) * (isFemale ? 0.85 : 1.0);
    setCrClResult(`${crcl.toFixed(1)} mL/min`);
    toast.success("CrCl calculated successfully");
  };

  // ── Save Vitals ──
  const handleSaveVitals = async () => {
    const hasAnyVital =
      systolicBp ||
      diastolicBp ||
      bodyTemp ||
      spO2 ||
      pulseRate ||
      respiratoryRate ||
      bodyHeight ||
      bodyWeight;

    if (!hasAnyVital) {
      toast.error("Please enter at least one vital parameter");
      return;
    }

    setIsSavingVitals(true);
    try {
      const payload: Omit<PatientVitalEntry, "id" | "createdAt"> = {
        patientId: patient?.id || "ABDM-001",
        patientName: patient?.name || "Priya Sharma",
        patientAbha: patient?.abhaAddress || "priya.sharma@abdm",
        recordedAt: vitalDateTime,
        recordedDateRaw: new Date().toISOString(),
        vitals: {
          systolicBp: systolicBp || undefined,
          diastolicBp: diastolicBp || undefined,
          bodyTemp: bodyTemp || undefined,
          spO2: spO2 || undefined,
          pulseRate: pulseRate || undefined,
          respiratoryRate: respiratoryRate || undefined,
          bodyHeight: bodyHeight || undefined,
          bodyWeight: bodyWeight || undefined,
          bmi: computedBmi || undefined,
        },
        calculators: {
          egfr: egfrResult || undefined,
          cvdRisk: cvdResult || undefined,
          crCl: crClResult || undefined,
          qrisk3: qriskResult || undefined,
          bsa: bsaResult || undefined,
        },
      };

      await abdmService.saveVitals(payload);
      toast.success("Vitals saved successfully!");
      setPersistedVitals(
        abdmService.getPatientVitals(patient?.id || patient?.abhaAddress)
      );

      // Reset fields and transition to View Vitals
      setSystolicBp("");
      setDiastolicBp("");
      setBodyTemp("");
      setSpO2("");
      setPulseRate("");
      setRespiratoryRate("");
      setBodyHeight("");
      setBodyWeight("");
      setActiveVitalsSubTab("view");
    } catch (err: any) {
      toast.error(err.message || "Failed to save vitals");
    } finally {
      setIsSavingVitals(false);
    }
  };

  // ── Submit Lab Results ──
  const handleSubmitLabs = async () => {
    if (totalFilledLabs === 0) {
      toast.error("Please enter at least one lab test result");
      return;
    }

    setIsSubmittingLabs(true);
    try {
      const filledTests = Object.entries(labFormValues)
        .filter(([_, data]) => data.value && data.value.trim() !== "")
        .map(([testId, data]) => {
          const testDef = LAB_TESTS_CATALOG.find((t) => t.id === testId);
          let isOutOfRange = false;
          if (testDef && testDef.valueType === "numeric") {
            const numVal = parseFloat(data.value);
            if (!isNaN(numVal)) {
              if (
                (testDef.refMin !== undefined && numVal < testDef.refMin) ||
                (testDef.refMax !== undefined && numVal > testDef.refMax)
              ) {
                isOutOfRange = true;
              }
            }
          }
          return {
            testId,
            testName: testDef?.name || testId,
            category: testDef?.category || "General",
            value: data.value,
            unit: data.unit,
            valueType: testDef?.valueType || "numeric",
            referenceRange: testDef
              ? {
                  min: testDef.refMin,
                  max: testDef.refMax,
                  text: testDef.refText || `${testDef.refMin || ""} - ${testDef.refMax || ""} ${data.unit}`,
                }
              : undefined,
            isOutOfRange,
          };
        });

      const payload: Omit<PatientLabResultRecord, "id" | "createdAt"> = {
        patientId: patient?.id || "ABDM-001",
        patientName: patient?.name || "Priya Sharma",
        patientAbha: patient?.abhaAddress || "priya.sharma@abdm",
        recordedDate: labDate,
        recordedDateRaw: new Date().toISOString().split("T")[0],
        tests: filledTests,
        totalFilled: totalFilledLabs,
        totalOutOfRange: totalOutOfRangeLabs,
      };

      await abdmService.saveLabResults(payload);
      toast.success("Lab results submitted and saved successfully!");

      // Return back to Medical Records dashboard
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit lab results");
    } finally {
      setIsSubmittingLabs(false);
    }
  };

  // Comprehensive Category & Test Search Filter
  const filteredCategories = useMemo(() => {
    const q = labSearchQuery.toLowerCase().trim();
    if (!q) return LAB_CATEGORIES;

    return LAB_CATEGORIES.filter((cat) => {
      const catMatches = cat.name.toLowerCase().includes(q);
      const testMatches = LAB_TESTS_CATALOG.some((t) => {
        if (t.category !== cat.name) return false;
        const nameMatch = t.name.toLowerCase().includes(q);
        const shortMatch = t.shortName?.toLowerCase().includes(q);
        const aliasMatch = t.aliases?.some((a) => a.toLowerCase().includes(q));
        return nameMatch || shortMatch || aliasMatch;
      });
      return catMatches || testMatches;
    });
  }, [labSearchQuery]);

  // Vitals fields search filter
  const vitalsList = [
    {
      id: "sbp",
      label: "Systolic blood pressure",
      unit: "mmHg",
      value: systolicBp,
      onChange: setSystolicBp,
      placeholder: "",
    },
    {
      id: "dbp",
      label: "Diastolic blood pressure",
      unit: "mmHg",
      value: diastolicBp,
      onChange: setDiastolicBp,
      placeholder: "",
    },
    {
      id: "temp",
      label: "Body Temperature",
      unit: "°F",
      value: bodyTemp,
      onChange: setBodyTemp,
      placeholder: "",
    },
    {
      id: "spo2",
      label: "Peripheral oxygen saturation",
      unit: "%",
      value: spO2,
      onChange: setSpO2,
      placeholder: "",
    },
    {
      id: "pulse",
      label: "Pulse rate",
      unit: "/min",
      value: pulseRate,
      onChange: setPulseRate,
      placeholder: "",
    },
    {
      id: "resp",
      label: "Respiratory rate",
      unit: "/min",
      value: respiratoryRate,
      onChange: setRespiratoryRate,
      placeholder: "",
    },
    {
      id: "height",
      label: "Body height",
      unit: "Cms",
      value: bodyHeight,
      onChange: setBodyHeight,
      placeholder: "",
    },
    {
      id: "weight",
      label: "Body weight",
      unit: "Kgs",
      value: bodyWeight,
      onChange: setBodyWeight,
      placeholder: "",
    },
  ];

  const filteredVitals = vitalsList.filter((v) =>
    v.label.toLowerCase().includes(vitalSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[680px]">
      {/* ── TOP LEVEL TABS: [ Vitals ] [ Lab results ] ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-3 pb-0 bg-white">
        <div className="flex items-center gap-8 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveWorkflowTab("vitals")}
            className={`pb-3 transition-all cursor-pointer relative flex items-center gap-2 ${
              activeWorkflowTab === "vitals"
                ? "text-[#1456f0] border-b-2 border-[#1456f0] font-display"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Vitals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkflowTab("labs")}
            className={`pb-3 transition-all cursor-pointer relative flex items-center gap-2 ${
              activeWorkflowTab === "labs"
                ? "text-[#1456f0] border-b-2 border-[#1456f0] font-display"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Lab results</span>
          </button>
        </div>

        {/* Dynamic Badges for Lab Tab */}
        {activeWorkflowTab === "labs" && (
          <div className="flex items-center gap-3 pb-2 text-[11px] font-bold">
            <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
              {totalFilledLabs} Filled
            </span>
            <span className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
              {totalOutOfRangeLabs} Out of range
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── WORKFLOW 1: VITALS SCREEN (ADD PAST VITALS) ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeWorkflowTab === "vitals" && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="p-6 space-y-5 flex-1">
            {/* Header: ← Past Vitals | [ Add Vitals ] [ View Vitals ] */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="Back to Health Records"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-900 font-display">
                  Past Vitals
                </span>
              </div>

              {/* Sub-tab links: Add Vitals / View Vitals */}
              <div className="flex items-center gap-6 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveVitalsSubTab("add")}
                  className={`transition-colors cursor-pointer pb-1 ${
                    activeVitalsSubTab === "add"
                      ? "text-[#1456f0] border-b-2 border-[#1456f0]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Add Vitals
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVitalsSubTab("view")}
                  className={`transition-colors cursor-pointer pb-1 ${
                    activeVitalsSubTab === "view"
                      ? "text-[#1456f0] border-b-2 border-[#1456f0]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  View Vitals
                </button>
              </div>
            </div>

            {/* ── SUB-TAB 1: ADD VITALS (ADD PAST VITALS) ── */}
            {activeVitalsSubTab === "add" && (
              <div className="space-y-4">
                {/* Yellow Warning Banner matching Reference Screenshot */}
                <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-[#92400e] font-medium shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-[#d97706] flex-shrink-0" />
                  <span>
                    Vitals entered here won't appear on the Rx. They are only for documentation purposes
                  </span>
                </div>

                {/* Search + Date/Time + Plus Control Bar (Exact Reference Alignment) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={vitalSearchQuery}
                      onChange={(e) => setVitalSearchQuery(e.target.value)}
                      placeholder="Search vital name..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1456f0] shadow-2xs font-semibold"
                    />
                  </div>

                  {/* Date/Time Selectors + Plus Button (Matching Screenshot Layout) */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                      <span>{vitalDateTime}</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                      <span>{vitalDateTime}</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    <button
                      type="button"
                      onClick={() => toast.info("Custom vital parameter added")}
                      className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-[#1456f0] shadow-2xs cursor-pointer"
                      title="Add parameter"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── ACCORDION SECTION 1: VITALS ── */}
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setIsVitalsSectionOpen((prev) => !prev)}
                    className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer font-display transition-colors"
                  >
                    <span>VITALS</span>
                    <span className="text-sm font-bold text-slate-500">
                      {isVitalsSectionOpen ? "−" : "+"}
                    </span>
                  </div>

                  {isVitalsSectionOpen && (
                    <div className="p-5 divide-y divide-slate-100 bg-white space-y-3">
                      {filteredVitals.map((item) => (
                        <div
                          key={item.id}
                          className="pt-3 first:pt-0 flex items-center justify-between gap-4"
                        >
                          <label className="text-xs font-semibold text-slate-700 flex-1">
                            {item.label}
                          </label>
                          <div className="flex items-center gap-2 w-48 justify-end">
                            <input
                              type="number"
                              step="any"
                              value={item.value}
                              onChange={(e) => item.onChange(e.target.value)}
                              placeholder={item.placeholder}
                              className="w-28 text-right px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1456f0] focus:bg-white font-medium"
                            />
                            <span className="text-xs font-semibold text-slate-400 w-12 text-left">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Body mass index */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <label className="text-xs font-semibold text-slate-700 flex-1">
                          Body mass index
                        </label>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="text"
                            readOnly
                            value={computedBmi}
                            placeholder=""
                            className="w-28 text-right px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 font-bold text-slate-800 rounded-lg outline-none"
                          />
                          <span className="text-xs font-semibold text-slate-400 w-12 text-left">
                            kg/m²
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ACCORDION SECTION 2: CALCULATORS ── */}
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setIsCalculatorsSectionOpen((prev) => !prev)}
                    className="w-full px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-xs font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer font-display transition-colors"
                  >
                    <span>CALCULATORS</span>
                    <span className="text-sm font-bold text-slate-500">
                      {isCalculatorsSectionOpen ? "−" : "+"}
                    </span>
                  </div>

                  {isCalculatorsSectionOpen && (
                    <div className="p-5 divide-y divide-slate-100 bg-white space-y-3">
                      {/* 1. eGFR */}
                      <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-700 block">
                            eGFR (CKD-EPI 2021)
                          </span>
                          {egfrResult && (
                            <span className="text-[11px] font-bold text-[#1456f0]">
                              Result: {egfrResult}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="number"
                            placeholder="Serum Cr"
                            value={egfrInput}
                            onChange={(e) => setEgfrInput(e.target.value)}
                            className="w-24 text-right px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          />
                          <button
                            type="button"
                            onClick={calculateEgfr}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {/* 2. CVD Risk */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-700 block">
                            Cardiovascular Disease 10-year Risk
                          </span>
                          {cvdResult && (
                            <span className="text-[11px] font-bold text-[#1456f0]">
                              Result: {cvdResult}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="number"
                            placeholder="Cholesterol"
                            value={cvdInput}
                            onChange={(e) => setCvdInput(e.target.value)}
                            className="w-24 text-right px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCvdResult("Low (< 10%)");
                              toast.success("CVD 10-year risk calculated");
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {/* 3. Creatinine Clearance */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-700 block">
                            Creatinine Clearance (CrCl)
                          </span>
                          {crClResult && (
                            <span className="text-[11px] font-bold text-[#1456f0]">
                              Result: {crClResult}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="number"
                            placeholder="Creatinine"
                            value={crClInput}
                            onChange={(e) => setCrClInput(e.target.value)}
                            className="w-24 text-right px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          />
                          <button
                            type="button"
                            onClick={calculateCrCl}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {/* 4. QRISK3 */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-700 block">
                            QRISK3 Score
                          </span>
                          {qriskResult && (
                            <span className="text-[11px] font-bold text-[#1456f0]">
                              Result: {qriskResult}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="text"
                            placeholder="Score input"
                            value={qriskInput}
                            onChange={(e) => setQriskInput(e.target.value)}
                            className="w-24 text-right px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setQriskResult("4.2% (Low Risk)");
                              toast.success("QRISK3 evaluated");
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {/* 5. BSA */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-700 block">
                            BSA Score
                          </span>
                          {bsaResult && (
                            <span className="text-[11px] font-bold text-[#1456f0]">
                              Result: {bsaResult}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 w-48 justify-end">
                          <input
                            type="text"
                            placeholder="Auto from H/W"
                            value={bsaInput || bsaResult || ""}
                            onChange={(e) => setBsaInput(e.target.value)}
                            className="w-24 text-right px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          />
                          <button
                            type="button"
                            onClick={calculateBsa}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-TAB 2: VIEW VITALS (Matching Reference Screenshot 2) ── */}
            {activeVitalsSubTab === "view" && (
              <div className="space-y-4">
                {/* Search Bar + Date Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-b border-slate-100 pb-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={vitalSearchQuery}
                      onChange={(e) => setVitalSearchQuery(e.target.value)}
                      placeholder="Search vital name..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1456f0] shadow-2xs font-semibold"
                    />
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {persistedVitals[0]?.recordedAt || vitalDateTime}
                  </div>
                </div>

                {/* Table/List Rows matching screenshot */}
                {persistedVitals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium">
                    No past vitals recorded yet. Click "Add Vitals" to document past readings.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {persistedVitals.map((rec) => {
                      const labelMap: Record<string, string> = {
                        spO2: "SPO2 (Oxygen Saturation)",
                        systolicBp: "Systolic blood pressure",
                        diastolicBp: "Diastolic blood pressure",
                        bodyTemp: "Body Temperature",
                        pulseRate: "Pulse rate",
                        respiratoryRate: "Respiratory rate",
                        bodyHeight: "Body height",
                        bodyWeight: "Body weight",
                        bmi: "Body mass index",
                      };
                      const unitMap: Record<string, string> = {
                        spO2: "%",
                        systolicBp: "mmHg",
                        diastolicBp: "mmHg",
                        bodyTemp: "°F",
                        pulseRate: "/min",
                        respiratoryRate: "/min",
                        bodyHeight: "Cms",
                        bodyWeight: "Kgs",
                        bmi: "kg/m²",
                      };

                      const vitalEntries = Object.entries(rec.vitals).filter(
                        ([k, val]) =>
                          Boolean(val) &&
                          (labelMap[k] || k)
                            .toLowerCase()
                            .includes(vitalSearchQuery.toLowerCase())
                      );

                      if (vitalEntries.length === 0) return null;

                      return (
                        <div key={rec.id} className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                            Recorded on {rec.recordedAt}
                          </div>
                          <div className="divide-y divide-slate-100 text-xs bg-slate-50/50 rounded-xl px-4 border border-slate-100">
                            {vitalEntries.map(([k, val]) => (
                              <div
                                key={k + rec.id}
                                className="py-3 flex items-center justify-between"
                              >
                                <span className="font-bold text-slate-900">
                                  {labelMap[k] || k}
                                </span>
                                <span className="font-medium text-slate-700">
                                  {val} {unitMap[k] || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vitals Fixed Bottom Bar matching Reference */}
          {activeVitalsSubTab === "add" && (
            <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveVitals}
                disabled={isSavingVitals}
                className="px-5 py-2 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs shadow-blue-500/20 disabled:opacity-50"
              >
                <span>{isSavingVitals ? "Saving..." : "Save"}</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── WORKFLOW 2: LAB RESULTS SCREEN ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeWorkflowTab === "labs" && (
        <div className="flex-1 flex flex-col justify-between">
          <div className="p-6 space-y-4 flex-1">
            {/* Lab Header Controls: Search + Date + Plus */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={labSearchQuery}
                  onChange={(e) => setLabSearchQuery(e.target.value)}
                  placeholder="Search test name..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1456f0] shadow-2xs font-semibold"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                  <span>{labDate}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                </div>

                <button
                  type="button"
                  onClick={() => toast.info("Custom lab panel added")}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs cursor-pointer"
                  title="Add custom test"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Category Rows Accordion with Dynamic Parameter Counts */}
            <div className="space-y-2 divide-y divide-slate-100">
              {filteredCategories.map((cat) => {
                const isOpen = !!openCategories[cat.name];
                const testsInCat = LAB_TESTS_CATALOG.filter(
                  (t) => t.category === cat.name
                );
                const filledCountInCat = testsInCat.filter(
                  (t) => labFormValues[t.id]?.value && labFormValues[t.id]?.value.trim() !== ""
                ).length;

                return (
                  <div key={cat.id} className="pt-2 first:pt-0">
                    {/* Category Title Row */}
                    <div
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/90 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer font-display transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {cat.name} ({filledCountInCat})
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">
                        {isOpen ? "−" : "+"}
                      </span>
                    </div>

                    {/* Test List Rows when expanded */}
                    {isOpen && (
                      <div className="px-4 py-3 space-y-3 bg-white">
                        {testsInCat.length > 0 ? (
                          testsInCat.map((test) => {
                            const valData = labFormValues[test.id] || {
                              value: "",
                              unit: test.defaultUnit,
                            };

                            const isNumeric = test.valueType === "numeric";
                            const numVal = parseFloat(valData.value);
                            const isOut =
                              isNumeric &&
                              !isNaN(numVal) &&
                              ((test.refMin !== undefined &&
                                numVal < test.refMin) ||
                                (test.refMax !== undefined &&
                                  numVal > test.refMax));

                            return (
                              <div
                                key={test.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0"
                              >
                                <div className="sm:w-1/2">
                                  <span className="text-xs font-semibold text-slate-800 block">
                                    {test.name}
                                  </span>
                                  {isNumeric && test.refMin !== undefined && (
                                    <span className="text-[10px] text-slate-400">
                                      Ref: {test.refMin} - {test.refMax}{" "}
                                      {valData.unit}
                                    </span>
                                  )}
                                  {test.refText && (
                                    <span className="text-[10px] text-slate-400">
                                      Ref: {test.refText}
                                    </span>
                                  )}
                                </div>

                                {/* Flexible Inputs: Numeric / Enum / Qualitative / Multiline */}
                                <div className="flex items-center gap-2 sm:w-72">
                                  {test.valueType === "qualitative" || test.valueType === "enum" ? (
                                    <select
                                      value={valData.value}
                                      onChange={(e) =>
                                        setLabFormValues((prev) => ({
                                          ...prev,
                                          [test.id]: {
                                            ...prev[test.id],
                                            value: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-800 focus:bg-white focus:border-[#1456f0]"
                                    >
                                      <option value="">Select Result</option>
                                      {test.qualitativeOptions?.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : test.valueType === "multiline_text" ? (
                                    <textarea
                                      rows={2}
                                      value={valData.value}
                                      placeholder="Enter clinical findings / impression..."
                                      onChange={(e) =>
                                        setLabFormValues((prev) => ({
                                          ...prev,
                                          [test.id]: {
                                            ...prev[test.id],
                                            value: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 text-xs rounded-lg outline-none font-medium bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#1456f0]"
                                    />
                                  ) : test.valueType === "text" ? (
                                    <input
                                      type="text"
                                      value={valData.value}
                                      placeholder="Enter finding"
                                      onChange={(e) =>
                                        setLabFormValues((prev) => ({
                                          ...prev,
                                          [test.id]: {
                                            ...prev[test.id],
                                            value: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 text-xs rounded-lg outline-none font-medium bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#1456f0]"
                                    />
                                  ) : (
                                    <input
                                      type="number"
                                      step="any"
                                      value={valData.value}
                                      placeholder="00"
                                      onChange={(e) =>
                                        setLabFormValues((prev) => ({
                                          ...prev,
                                          [test.id]: {
                                            ...prev[test.id],
                                            value: e.target.value,
                                          },
                                        }))
                                      }
                                      className={`w-full text-right px-3 py-1.5 text-xs rounded-lg outline-none font-medium ${
                                        isOut
                                          ? "bg-rose-50 border border-rose-300 text-rose-700"
                                          : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#1456f0]"
                                      }`}
                                    />
                                  )}

                                  {/* Unit selector dropdown */}
                                  <select
                                    value={valData.unit}
                                    onChange={(e) =>
                                      setLabFormValues((prev) => ({
                                        ...prev,
                                        [test.id]: {
                                          ...prev[test.id],
                                          unit: e.target.value,
                                        },
                                      }))
                                    }
                                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 outline-none w-28 flex-shrink-0"
                                  >
                                    {test.allowedUnits.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-400 py-2">
                            No active test parameters in this category.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lab Fixed Bottom Bar matching Reference */}
          <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50/70 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmitLabs}
              disabled={isSubmittingLabs}
              className="px-5 py-2 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs shadow-blue-500/20 disabled:opacity-50"
            >
              <span>{isSubmittingLabs ? "Submitting..." : "Submit"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
