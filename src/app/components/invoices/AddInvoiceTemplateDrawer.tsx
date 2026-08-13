import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  CheckCircle2,
  Palette,
  Sparkles,
  Building,
  User,
  ListFilter,
  Check,
  UploadCloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  FileCode,
  Layout,
  Type,
  ShieldAlert,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { InvoiceTemplate } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import DrawerShell from "../ui/DrawerShell";

interface AddInvoiceTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: InvoiceTemplate | null;
  onTemplateSaved?: (template: InvoiceTemplate) => void;
}

const ACCENT_COLORS = [
  { label: "Classic Blue", hex: "#2563EB" },
  { label: "Emerald Green", hex: "#059669" },
  { label: "Royal Purple", hex: "#7C3AED" },
  { label: "Warm Amber", hex: "#D97706" },
  { label: "Rose Red", hex: "#DC2626" },
  { label: "Ocean Cyan", hex: "#0284C7" },
  { label: "Slate Dark", hex: "#0F172A" },
];

const FONT_OPTIONS = [
  { key: "Outfit, sans-serif", label: "Outfit (Modern)" },
  { key: "DM Sans, sans-serif", label: "DM Sans (Clean)" },
  { key: "Inter, sans-serif", label: "Inter (Corporate)" },
  { key: "Roboto, sans-serif", label: "Roboto (Standard)" },
  { key: "Georgia, serif", label: "Georgia (Classic Serif)" },
  { key: "Courier New, monospace", label: "Monospace (Receipt)" },
];

const HEADER_FIELD_OPTIONS = [
  { key: "businessName", label: "Business / Clinic Name" },
  { key: "address", label: "Clinic Address" },
  { key: "phone", label: "Contact Phone" },
  { key: "email", label: "Support Email" },
  { key: "taxId", label: "Tax ID / NPI Number" },
];

const BILL_TO_FIELD_OPTIONS = [
  { key: "name", label: "Client Name" },
  { key: "email", label: "Client Email" },
  { key: "phone", label: "Client Phone" },
  { key: "address", label: "Client Billing Address" },
  { key: "patientId", label: "Patient ID / MRN" },
];

const COLUMN_OPTIONS = [
  { key: "description", label: "Item Description" },
  { key: "quantity", label: "Quantity / Units" },
  { key: "unitPrice", label: "Unit Price ($)" },
  { key: "discount", label: "Line Discount ($)" },
  { key: "amount", label: "Total Amount ($)" },
];

const SAMPLE_VARIABLE_HELPERS = [
  { tag: "{client_name}", label: "Client Name" },
  { tag: "{client_email}", label: "Client Email" },
  { tag: "{invoice_id}", label: "Invoice ID" },
  { tag: "{issue_date}", label: "Issue Date" },
  { tag: "{due_date}", label: "Due Date" },
  { tag: "{subtotal}", label: "Subtotal" },
  { tag: "{discount}", label: "Discount" },
  { tag: "{tax_amount}", label: "Tax Amount" },
  { tag: "{total_amount}", label: "Total Amount" },
  { tag: "{payment_mode}", label: "Payment Mode font-mono" },
];

export default function AddInvoiceTemplateDrawer({
  isOpen,
  onClose,
  initialTemplate,
  onTemplateSaved,
}: AddInvoiceTemplateDrawerProps) {
  const { saveInvoiceTemplate } = useInvoices();
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const footerLogoInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Tab State: "upload" | "header" | "columns" | "footer" | "style"
  const [activeTab, setActiveTab] = useState<"upload" | "header" | "columns" | "footer" | "style">("header");

  // Core Properties
  const [name, setName] = useState("");
  const [accentColor, setAccentColor] = useState("#2563EB");
  const [fontFamily, setFontFamily] = useState("Outfit, sans-serif");
  const [logoPlaceholder, setLogoPlaceholder] = useState("MantraCare Health & RCM");
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | undefined>(undefined);
  const [headerContent, setHeaderContent] = useState("");
  const [headerAlignment, setHeaderAlignment] = useState<"left" | "center" | "right">("left");
  const [headerFields, setHeaderFields] = useState<string[]>([
    "businessName",
    "address",
    "phone",
    "email",
  ]);

  // Bill-To & Table Columns
  const [billToFields, setBillToFields] = useState<string[]>([
    "name",
    "email",
    "phone",
  ]);
  const [lineItemColumns, setLineItemColumns] = useState<string[]>([
    "description",
    "quantity",
    "unitPrice",
    "amount",
  ]);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);

  // Footer & Signature
  const [footerNotes, setFooterNotes] = useState(
    "Payment due within 14 days of invoice issuance. Thank you for choosing MantraCare."
  );
  const [footerContent, setFooterContent] = useState(
    "Bank: MantraCare National Bank | Acc: 9876543210 | IFSC: MANT0001928"
  );
  const [footerLogoUrl, setFooterLogoUrl] = useState<string | undefined>(undefined);
  const [footerAlignment, setFooterAlignment] = useState<"left" | "center" | "right">("left");

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [rawTemplateText, setRawTemplateText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTemplate) {
        setName(initialTemplate.name);
        setAccentColor(initialTemplate.accentColor || "#2563EB");
        setFontFamily(initialTemplate.customCss || "Outfit, sans-serif");
        setLogoPlaceholder(initialTemplate.logoPlaceholder || "MantraCare Health & RCM");
        setHeaderLogoUrl(initialTemplate.headerLogoUrl);
        setHeaderContent(initialTemplate.headerContent || "");
        setHeaderAlignment(initialTemplate.headerAlignment || "left");
        setHeaderFields(initialTemplate.headerFields || ["businessName", "address", "phone", "email"]);
        setBillToFields(initialTemplate.billToFields || ["name", "email", "phone"]);
        setLineItemColumns(initialTemplate.lineItemColumns || ["description", "quantity", "unitPrice", "amount"]);
        setShowTaxBreakdown(initialTemplate.showTaxBreakdown ?? true);
        setFooterNotes(initialTemplate.footerNotes || "");
        setFooterContent(initialTemplate.footerContent || "");
        setFooterLogoUrl(initialTemplate.footerLogoUrl);
        setFooterAlignment(initialTemplate.footerAlignment || "left");
        setUploadedFileName(initialTemplate.uploadedFileName || "");
        setRawTemplateText(initialTemplate.rawTemplateText || "");
        setIsDefault(initialTemplate.isDefault || false);
      } else {
        setName("");
        setAccentColor("#2563EB");
        setFontFamily("Outfit, sans-serif");
        setLogoPlaceholder("MantraCare Health & RCM");
        setHeaderLogoUrl(undefined);
        setHeaderContent("");
        setHeaderAlignment("left");
        setHeaderFields(["businessName", "address", "phone", "email"]);
        setBillToFields(["name", "email", "phone"]);
        setLineItemColumns(["description", "quantity", "unitPrice", "amount"]);
        setShowTaxBreakdown(true);
        setFooterNotes("Payment due within 14 days of invoice issuance. Thank you for choosing MantraCare.");
        setFooterContent("Bank: MantraCare National Bank | Acc: 9876543210 | IFSC: MANT0001928");
        setFooterLogoUrl(undefined);
        setFooterAlignment("left");
        setUploadedFileName("");
        setRawTemplateText("");
        setIsDefault(false);
      }
    }
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

  const toggleArrayItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleHeaderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setHeaderLogoUrl(evt.target.result as string);
        toast.success(`Header logo uploaded: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFooterLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setFooterLogoUrl(evt.target.result as string);
        toast.success(`Footer signature/stamp uploaded: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }

    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (isDocx) {
      setIsExtracting(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const extractedText = result.value;

          if (!extractedText || !extractedText.trim()) {
            toast.error("Word document contains no extractable text.");
          } else {
            setRawTemplateText(extractedText);
            toast.success(`Extracted content from "${file.name}"!`);
          }
        } catch (err) {
          console.error("Mammoth error:", err);
          toast.error("Failed to parse Word document.");
        } finally {
          setIsExtracting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // .txt or .html file
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          setRawTemplateText(text);
          toast.success(`Loaded template file "${file.name}"!`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInsertTag = (tag: string, target: "footer" | "header" | "raw") => {
    if (target === "footer") setFooterNotes((prev) => `${prev} ${tag}`);
    else if (target === "header") setHeaderContent((prev) => `${prev} ${tag}`);
    else setRawTemplateText((prev) => `${prev} ${tag}`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const saved = saveInvoiceTemplate({
      id: initialTemplate?.id,
      name: name.trim(),
      accentColor,
      logoPlaceholder: logoPlaceholder.trim(),
      headerLogoUrl,
      headerContent,
      headerAlignment,
      headerFields,
      billToFields,
      lineItemColumns,
      showTaxBreakdown,
      footerNotes,
      footerContent,
      footerLogoUrl,
      footerAlignment,
      uploadedFileName,
      rawTemplateText,
      customCss: fontFamily,
      isDefault,
    });

    toast.success(`Custom Invoice Template "${saved.name}" saved successfully!`);
    if (onTemplateSaved) onTemplateSaved(saved);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-[70vw]"
      title={initialTemplate ? `Edit Custom Template: ${initialTemplate.name}` : "Build Full Custom Invoice Template"}
      subtitle="Upload template files, customize headers/footers, logos, signatures, columns, and brand colors"
      icon={
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          <FileText className="w-5 h-5" />
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row h-full gap-6 p-6 overflow-y-auto bg-slate-50/50 min-h-0">
        {/* LEFT PANE: Builder Controls */}
        <div className="w-full lg:w-1/2 space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-y-auto max-h-[78vh]">
          <div className="space-y-4">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("header")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "header" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Building className="w-3.5 h-3.5" /> Header
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("columns")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "columns" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" /> Table & Fields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("footer")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "footer" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Footer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "upload" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> File Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("style")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "style" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> Theme
              </button>
            </div>

            {/* Template Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Template Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Clinical Consultation Invoice, Standard Receipt"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* TAB 1: HEADER BUILDER */}
            {activeTab === "header" && (
              <div className="space-y-4 pt-1">
                {/* Header Logo Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Header Logo Image</span>
                    {headerLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setHeaderLogoUrl(undefined)}
                        className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Logo
                      </button>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    {headerLogoUrl ? (
                      <div className="w-16 h-16 rounded-xl border border-slate-200 p-1 bg-white flex items-center justify-center overflow-hidden">
                        <img src={headerLogoUrl} alt="Header Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={headerLogoInputRef}
                        accept="image/*"
                        onChange={handleHeaderLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => headerLogoInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Upload Logo File
                      </button>
                      <p className="text-[11px] text-slate-400">PNG, JPG, SVG up to 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Brand Name & Tagline */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Clinic / Brand Header Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MantraCare Health & RCM Services"
                    value={logoPlaceholder}
                    onChange={(e) => setLogoPlaceholder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Header Alignment */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Header Alignment
                  </label>
                  <div className="flex items-center gap-2">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setHeaderAlignment(align)}
                        className={`flex-1 py-1.5 border rounded-xl text-xs font-bold capitalize flex items-center justify-center gap-1.5 transition-colors ${
                          headerAlignment === align
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                        <span>{align}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Header Text / HTML */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Custom Header Subtitle / Tagline</span>
                    <span className="text-[10px] text-slate-400 font-mono">HTML / Placeholders</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Multi-Specialty Billing & Telehealth Division | NPI: 1982301928"
                    value={headerContent}
                    onChange={(e) => setHeaderContent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Header Info Fields */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Visible Business Header Details
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {HEADER_FIELD_OPTIONS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={headerFields.includes(f.key)}
                          onChange={() => toggleArrayItem(headerFields, setHeaderFields, f.key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TABLE & BILL-TO FIELDS */}
            {activeTab === "columns" && (
              <div className="space-y-4 pt-1">
                {/* Bill To Fields */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Bill-To Client Fields
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {BILL_TO_FIELD_OPTIONS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={billToFields.includes(f.key)}
                          onChange={() => toggleArrayItem(billToFields, setBillToFields, f.key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Table Columns */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-slate-400" /> Line Item Table Columns
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {COLUMN_OPTIONS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={lineItemColumns.includes(c.key)}
                          onChange={() => toggleArrayItem(lineItemColumns, setLineItemColumns, c.key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tax Breakdown Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Show Sales Tax Breakdown (8%)</span>
                    <span className="text-[11px] text-slate-400">Display itemized tax row before grand total</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTaxBreakdown}
                      onChange={(e) => setShowTaxBreakdown(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: FOOTER BUILDER */}
            {activeTab === "footer" && (
              <div className="space-y-4 pt-1">
                {/* Footer Signature/Stamp Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Footer Signature / Official Stamp Image</span>
                    {footerLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setFooterLogoUrl(undefined)}
                        className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Signature
                      </button>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    {footerLogoUrl ? (
                      <div className="w-24 h-12 rounded-xl border border-slate-200 p-1 bg-white flex items-center justify-center overflow-hidden">
                        <img src={footerLogoUrl} alt="Footer Stamp" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                        No Signature
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        ref={footerLogoInputRef}
                        accept="image/*"
                        onChange={handleFooterLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => footerLogoInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Upload Signature/Stamp
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Alignment */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Footer Text Alignment
                  </label>
                  <div className="flex items-center gap-2">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setFooterAlignment(align)}
                        className={`flex-1 py-1.5 border rounded-xl text-xs font-bold capitalize flex items-center justify-center gap-1.5 transition-colors ${
                          footerAlignment === align
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                        <span>{align}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Terms & Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Payment Terms & Notice
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Variable shortcuts</span>
                  </div>

                  {/* Variable Shortcuts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SAMPLE_VARIABLE_HELPERS.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag, "footer")}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded text-[10px] font-mono transition-colors"
                      >
                        + {v.tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="e.g. Payment due for {client_name} by {due_date}."
                    value={footerNotes}
                    onChange={(e) => setFooterNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bank / UPI / Payment Instructions */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Bank Account / Payment Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Bank Details, UPI QR ID, Wire Transfer Instructions"
                    value={footerContent}
                    onChange={(e) => setFooterContent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: FILE UPLOAD (DOCX / TXT / HTML) */}
            {activeTab === "upload" && (
              <div className="space-y-4 pt-1">
                <div className="p-4 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Upload Custom Invoice Template File (.docx, .txt, .html)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload your own branded Word document or text template containing variable tags
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={templateFileInputRef}
                    accept=".docx,.doc,.txt,.html"
                    onChange={handleTemplateFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => templateFileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Extracting Template...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" /> Browse File
                      </>
                    )}
                  </button>
                  {uploadedFileName && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {uploadedFileName}
                    </div>
                  )}
                </div>

                {/* Raw Template Text Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Uploaded Raw Template Text
                    </label>
                    <div className="flex items-center gap-1">
                      {SAMPLE_VARIABLE_HELPERS.slice(0, 4).map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => handleInsertTag(v.tag, "raw")}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono hover:bg-blue-50"
                        >
                          + {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Uploaded raw template layout text will appear here..."
                    value={rawTemplateText}
                    onChange={(e) => setRawTemplateText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: THEME & BRANDING */}
            {activeTab === "style" && (
              <div className="space-y-4 pt-1">
                {/* Accent Branding Color */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" /> Primary Branding Accent Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setAccentColor(c.hex)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          accentColor === c.hex
                            ? "ring-2 ring-offset-2 ring-slate-800 scale-110"
                            : "hover:scale-105 opacity-90"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {accentColor === c.hex && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      title="Custom hex color"
                    />
                  </div>
                </div>

                {/* Font Selection */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-slate-400" /> Typography / Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Set as Default Invoice Template</span>
            </label>
          </div>
        </div>

        {/* RIGHT PANE: Live Visual Document Preview */}
        <div className="w-full lg:w-1/2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between overflow-y-auto max-h-[78vh]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Real-Time Visual Preview
                </span>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs"
                style={{ backgroundColor: accentColor, fontFamily }}
              >
                {name || "Custom Template"}
              </span>
            </div>

            {/* Simulated Printed Document Canvas */}
            <div
              className="border border-slate-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs"
              style={{ fontFamily }}
            >
              {/* Document Header */}
              <div
                className={`flex flex-col border-b border-slate-200 pb-5 space-y-2 ${
                  headerAlignment === "center"
                    ? "text-center items-center"
                    : headerAlignment === "right"
                    ? "text-right items-end"
                    : "text-left items-start"
                }`}
              >
                <div className="flex items-center gap-3">
                  {headerLogoUrl ? (
                    <img src={headerLogoUrl} alt="Logo" className="h-10 object-contain" />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  )}
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {logoPlaceholder || "MantraCare Health & RCM"}
                  </h3>
                </div>

                {headerContent && (
                  <p className="text-xs text-slate-600 font-medium italic">{headerContent}</p>
                )}

                <div className="text-xs text-slate-500 space-y-0.5">
                  {headerFields.includes("address") && <p>100 Healthcare Blvd, Suite 400</p>}
                  {headerFields.includes("phone") && <p>Ph: +1 (555) 123-4567</p>}
                  {headerFields.includes("email") && <p>support@mantracare.com</p>}
                </div>
              </div>

              {/* Title & Document Meta */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span
                  className="text-xl font-extrabold uppercase tracking-tight"
                  style={{ color: accentColor }}
                >
                  INVOICE
                </span>
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-800 font-mono block">#INV-SAMPLE-101</span>
                  <span className="text-slate-400 block">Date: May 12, 2026</span>
                  <span className="text-slate-400 block">Due Date: May 26, 2026</span>
                </div>
              </div>

              {/* Bill To Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  BILL TO:
                </span>
                {billToFields.includes("name") && <p className="font-bold text-slate-800">Sarah Jenkins</p>}
                {billToFields.includes("email") && <p className="text-slate-500">sarah.jenkins@example.com</p>}
                {billToFields.includes("phone") && <p className="text-slate-500">+1 (555) 987-6543</p>}
                {billToFields.includes("patientId") && (
                  <p className="text-slate-400 font-mono text-[10px]">Patient MRN: #PAT-8821</p>
                )}
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden border border-slate-200 rounded-xl text-xs">
                <table className="w-full text-left border-collapse">
                  <thead style={{ backgroundColor: accentColor, color: "#FFFFFF" }}>
                    <tr>
                      {lineItemColumns.includes("description") && (
                        <th className="p-2.5 text-xs font-semibold">Description</th>
                      )}
                      {lineItemColumns.includes("quantity") && (
                        <th className="p-2.5 text-center text-xs font-semibold">Qty</th>
                      )}
                      {lineItemColumns.includes("unitPrice") && (
                        <th className="p-2.5 text-right text-xs font-semibold">Unit Price</th>
                      )}
                      {lineItemColumns.includes("discount") && (
                        <th className="p-2.5 text-right text-xs font-semibold">Discount</th>
                      )}
                      {lineItemColumns.includes("amount") && (
                        <th className="p-2.5 text-right text-xs font-semibold">Amount</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      {lineItemColumns.includes("description") && (
                        <td className="p-2.5 font-medium">Initial Health Consultation</td>
                      )}
                      {lineItemColumns.includes("quantity") && <td className="p-2.5 text-center">1</td>}
                      {lineItemColumns.includes("unitPrice") && <td className="p-2.5 text-right">$150.00</td>}
                      {lineItemColumns.includes("discount") && (
                        <td className="p-2.5 text-right text-emerald-600">-$10.00</td>
                      )}
                      {lineItemColumns.includes("amount") && (
                        <td className="p-2.5 text-right font-semibold">$140.00</td>
                      )}
                    </tr>
                    <tr>
                      {lineItemColumns.includes("description") && (
                        <td className="p-2.5 font-medium">Comprehensive Lab Diagnostics</td>
                      )}
                      {lineItemColumns.includes("quantity") && <td className="p-2.5 text-center">1</td>}
                      {lineItemColumns.includes("unitPrice") && <td className="p-2.5 text-right">$85.00</td>}
                      {lineItemColumns.includes("discount") && <td className="p-2.5 text-right text-slate-400">$0.00</td>}
                      {lineItemColumns.includes("amount") && (
                        <td className="p-2.5 text-right font-semibold">$85.00</td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-1">
                <div className="w-60 space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">$225.00</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-$10.00</span>
                  </div>
                  {showTaxBreakdown && (
                    <div className="flex justify-between text-slate-500">
                      <span>Sales Tax (8%)</span>
                      <span>$17.20</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-slate-300 font-bold text-sm text-slate-900">
                    <span>Total Amount</span>
                    <span style={{ color: accentColor }}>$232.20</span>
                  </div>
                </div>
              </div>

              {/* Custom Uploaded Raw Template Content */}
              {rawTemplateText && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Custom Template File Text:
                  </span>
                  <div className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                    {rawTemplateText
                      .replace(/\{client_name\}/g, "Sarah Jenkins")
                      .replace(/\{client_email\}/g, "sarah.jenkins@example.com")
                      .replace(/\{invoice_id\}/g, "INV-SAMPLE-101")
                      .replace(/\{issue_date\}/g, "May 12, 2026")
                      .replace(/\{due_date\}/g, "May 26, 2026")
                      .replace(/\{subtotal\}/g, "$225.00")
                      .replace(/\{discount\}/g, "$10.00")
                      .replace(/\{tax_amount\}/g, "$17.20")
                      .replace(/\{total_amount\}/g, "$232.20")
                      .replace(/\{payment_mode\}/g, "Card / Link")}
                  </div>
                </div>
              )}

              {/* Custom Footer Notes & Bank Instructions */}
              <div
                className={`pt-4 border-t border-slate-200 text-xs space-y-2 ${
                  footerAlignment === "center"
                    ? "text-center"
                    : footerAlignment === "right"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {footerNotes && (
                  <p className="text-slate-600 italic">
                    {footerNotes
                      .replace(/\{client_name\}/g, "Sarah Jenkins")
                      .replace(/\{invoice_id\}/g, "INV-SAMPLE-101")
                      .replace(/\{due_date\}/g, "May 26, 2026")}
                  </p>
                )}

                {footerContent && (
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 font-mono">
                    {footerContent}
                  </div>
                )}

                {/* Footer Signature Image */}
                {footerLogoUrl && (
                  <div
                    className={`pt-2 flex ${
                      footerAlignment === "center"
                        ? "justify-center"
                        : footerAlignment === "right"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div className="text-center space-y-1">
                      <img src={footerLogoUrl} alt="Signature" className="h-10 object-contain mx-auto" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
              style={{ backgroundColor: accentColor, fontFamily: "Outfit, sans-serif" }}
            >
              <CheckCircle2 className="w-4 h-4" /> Save Custom Template
            </button>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
