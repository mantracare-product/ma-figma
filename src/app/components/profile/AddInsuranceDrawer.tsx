import { useState, useRef } from "react";
import { X, Calendar, ChevronDown, CloudUpload, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsuranceFormValues {
  insuranceCompany: string;
  policyNumber: string;
  policyHolder: string;
  groupNumber: string;
  planType: string;
  effectiveDate: string;
  expiryDate: string;
  accidentDate: string;
  accidentState: string;
  claimNumber: string;
  uploadedFile: File | null;
}

export interface AddInsuranceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (values: InsuranceFormValues) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INSURANCE_COMPANIES = [
  "Aetna",
  "Anthem Blue Cross Blue Shield",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "MVP Health Care Medicaid",
  "United Healthcare",
  "Self-pay",
];

const POLICY_HOLDERS = ["SELF", "SPOUSE", "CHILD", "OTHER"];

const PLAN_TYPES = [
  "SELF PAY",
  "HMO",
  "PPO",
  "EPO",
  "POS",
  "HDHP",
  "COMMERCIAL",
  "MEDICARE",
  "MEDICAID",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const INITIAL_VALUES: InsuranceFormValues = {
  insuranceCompany: "",
  policyNumber: "",
  policyHolder: "SELF",
  groupNumber: "",
  planType: "SELF PAY",
  effectiveDate: "",
  expiryDate: "",
  accidentDate: "",
  accidentState: "",
  claimNumber: "",
  uploadedFile: null,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs font-medium text-gray-500 mb-1"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {children}
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}

function SelectField({ label, value, onChange, options, placeholder, disabled }: SelectFieldProps) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-8 ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer text-gray-800"}`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-300"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      />
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => (inputRef.current as any)?.showPicker?.()}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="MM/DD/YYYY"
          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddInsuranceDrawer({
  isOpen,
  onClose,
  onSubmit,
}: AddInsuranceDrawerProps) {
  const [form, setForm] = useState<InsuranceFormValues>(INITIAL_VALUES);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropOpen, setCompanyDropOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(INITIAL_VALUES);
    setCompanySearch("");
    setCompanyDropOpen(false);
    onClose();
  };

  const set = <K extends keyof InsuranceFormValues>(key: K, value: InsuranceFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filteredCompanies = INSURANCE_COMPANIES.filter((c) =>
    c.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleSubmit = () => {
    onSubmit?.(form);
    handleClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) set("uploadedFile", file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    set("uploadedFile", file);
  };

  return (
    <div className="fixed inset-0 flex justify-end overflow-hidden" style={{ zIndex: 800 }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-[480px] bg-white shadow-2xl h-full flex flex-col z-50"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Add Insurance
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-4 min-h-0">
          {/* Insurance Company — searchable combobox */}
          <div className="relative">
            <div className="relative border border-gray-300 rounded-md bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <span className="absolute top-2 left-3 text-[11px] font-medium text-gray-500 pointer-events-none">
                Insurance company
              </span>
              <div className="flex items-center px-3 pt-5 pb-2 gap-2">
                <input
                  type="text"
                  value={companySearch !== "" ? companySearch : form.insuranceCompany}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    if (!e.target.value) set("insuranceCompany", "");
                    setCompanyDropOpen(true);
                  }}
                  onFocus={() => { setCompanySearch(""); setCompanyDropOpen(true); }}
                  placeholder=""
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
                {form.insuranceCompany && (
                  <button
                    type="button"
                    onClick={() => { set("insuranceCompany", ""); setCompanySearch(""); }}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCompanyDropOpen(!companyDropOpen)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${companyDropOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Dropdown */}
            {companyDropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setCompanyDropOpen(false); setCompanySearch(""); }} />
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredCompanies.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No results</p>
                    ) : (
                      filteredCompanies.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            set("insuranceCompany", c);
                            setCompanySearch("");
                            setCompanyDropOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors cursor-pointer ${form.insuranceCompany === c ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-800"}`}
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {c}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            <p className="text-[11px] text-gray-500 mt-1.5 ml-0.5" style={{ fontFamily: "DM Sans, sans-serif" }}>
              If no insurance, select "Self-pay"
            </p>
          </div>

          {/* Row: Policy number + Policy holder */}
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Policy number"
              value={form.policyNumber}
              onChange={(v) => set("policyNumber", v)}
            />
            <SelectField
              label="Policy holder"
              value={form.policyHolder}
              onChange={(v) => set("policyHolder", v)}
              options={POLICY_HOLDERS}
            />
          </div>

          {/* Row: Group number + Plan type */}
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Group number"
              value={form.groupNumber}
              onChange={(v) => set("groupNumber", v)}
            />
            <SelectField
              label="Plan type"
              value={form.planType}
              onChange={(v) => set("planType", v)}
              options={PLAN_TYPES}
            />
          </div>

          {/* Row: Effective date + Expiry date */}
          <div className="grid grid-cols-2 gap-4">
            <DateField
              label="Effective date"
              value={form.effectiveDate}
              onChange={(v) => set("effectiveDate", v)}
            />
            <DateField
              label="Expiry date"
              value={form.expiryDate}
              onChange={(v) => set("expiryDate", v)}
            />
          </div>

          {/* Row: Accident date + Accident state */}
          <div className="grid grid-cols-2 gap-4">
            <DateField
              label="Accident date"
              value={form.accidentDate}
              onChange={(v) => set("accidentDate", v)}
            />
            <SelectField
              label="Accident state"
              value={form.accidentState}
              onChange={(v) => set("accidentState", v)}
              options={US_STATES}
              placeholder="Select state"
            />
          </div>

          {/* Claim number — half width */}
          <div className="w-1/2 pr-2">
            <TextField
              label="Claim number"
              value={form.claimNumber}
              onChange={(v) => set("claimNumber", v)}
            />
          </div>

          {/* File Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileInput}
            />
            {form.uploadedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-blue-500" />
                <p className="text-sm font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  {form.uploadedFile.name}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    set("uploadedFile", null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <CloudUpload className="w-9 h-9 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <strong>Drop Files Here</strong>{" "}
                  <span className="font-normal text-gray-400">Or</span>{" "}
                  <span className="inline-flex items-center px-3.5 py-1 border border-gray-300 rounded-full text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    Browse Files
                  </span>
                </p>
                <p className="text-xs text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Upload Insurance Card (PDF, PNG, or JPG) (max. 4.2MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
