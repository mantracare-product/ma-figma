import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { InvoiceTemplate } from "../../types/invoiceTypes";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Check,
  Palette,
  Layout,
  Settings2,
  Building2,
  User,
  Table,
  Plus,
} from "lucide-react";

interface InvoiceTemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: InvoiceTemplate | null;
  onSave: (template: InvoiceTemplate) => void;
}

const COLOR_PRESETS = [
  { hex: "#2563EB", label: "Blue" },
  { hex: "#059669", label: "Emerald" },
  { hex: "#7C3AED", label: "Purple" },
  { hex: "#D97706", label: "Amber" },
  { hex: "#DC2626", label: "Rose" },
  { hex: "#1F2937", label: "Slate" },
];

const SAMPLE_INVOICE = {
  id: "INV-CL-9901",
  clientName: "Eleanor Vance",
  clientEmail: "eleanor.v@example.com",
  clientPhone: "+1 (555) 321-9876",
  createdAt: "2026-08-13",
  dueDate: "2026-08-27",
  paymentMode: "Bank Transfer",
  lineItems: [
    { id: "1", description: "Comprehensive Health Evaluation", quantity: 1, unitPrice: 200, amount: 200 },
    { id: "2", description: "Diagnostic Lab Panel", quantity: 1, unitPrice: 85, amount: 85 },
  ],
  subtotal: 285,
  taxAmount: 22.8,
  total: 307.8,
};

export default function InvoiceTemplateBuilderModal({
  isOpen,
  onClose,
  initialTemplate,
  onSave,
}: InvoiceTemplateBuilderModalProps) {
  const [name, setName] = useState(initialTemplate?.name || "Custom Invoice Template");
  const [isDefault, setIsDefault] = useState(initialTemplate?.isDefault || false);
  const [accentColor, setAccentColor] = useState(initialTemplate?.accentColor || "#2563EB");
  const [logoPlaceholder, setLogoPlaceholder] = useState(initialTemplate?.logoPlaceholder || "MantraAssist RCM");
  const [headerFields, setHeaderFields] = useState<string[]>(
    initialTemplate?.headerFields || ["businessName", "address", "phone", "email"]
  );
  const [billToFields, setBillToFields] = useState<string[]>(
    initialTemplate?.billToFields || ["name", "email", "phone"]
  );
  const [lineItemColumns, setLineItemColumns] = useState<string[]>(
    initialTemplate?.lineItemColumns || ["description", "quantity", "unitPrice", "amount"]
  );
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(
    initialTemplate?.showTaxBreakdown ?? true
  );
  const [footerNotes, setFooterNotes] = useState(
    initialTemplate?.footerNotes ||
      "Payment is due within 14 days of issue. Thank you for choosing MantraAssist RCM."
  );

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setIsDefault(initialTemplate.isDefault);
      setAccentColor(initialTemplate.accentColor);
      setLogoPlaceholder(initialTemplate.logoPlaceholder || "MantraAssist RCM");
      setHeaderFields(initialTemplate.headerFields || ["businessName", "address", "phone", "email"]);
      setBillToFields(initialTemplate.billToFields || ["name", "email", "phone"]);
      setLineItemColumns(
        initialTemplate.lineItemColumns || ["description", "quantity", "unitPrice", "amount"]
      );
      setShowTaxBreakdown(initialTemplate.showTaxBreakdown ?? true);
      setFooterNotes(initialTemplate.footerNotes || "");
    }
  }, [initialTemplate, isOpen]);

  const toggleHeaderField = (field: string) => {
    setHeaderFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleBillToField = (field: string) => {
    setBillToFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleLineItemColumn = (col: string) => {
    setLineItemColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    onSave({
      id: initialTemplate?.id || `tpl-${Date.now()}`,
      name: name.trim(),
      isDefault,
      accentColor,
      logoPlaceholder,
      headerFields,
      billToFields,
      lineItemColumns,
      showTaxBreakdown,
      footerNotes,
    });

    toast.success(`Template "${name.trim()}" saved!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-xl font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {initialTemplate ? `Edit Template: ${initialTemplate.name}` : "Invoice Template Builder"}
            </h3>
            <p className="text-xs text-slate-500">
              Configure layout blocks, columns, colors, and tax display with live real-time preview
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Check className="w-4 h-4" /> Save Invoice Template
          </button>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start max-h-[75vh] overflow-y-auto p-1">
        {/* LEFT PANE: Block Configurator */}
        <div className="w-full lg:w-1/2 space-y-5 bg-white p-5 border border-slate-200 rounded-2xl text-xs text-slate-700">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
              1. General Settings
            </span>
          </div>

          {/* Template Name & Default toggle */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Healthcare Invoice"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-bold text-slate-800">Set as Organization Default Template</span>
            </label>
          </div>

          {/* Accent Color Palette */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" /> Accent Branding Color
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setAccentColor(preset.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    accentColor === preset.hex ? "scale-110 ring-2 ring-offset-2 ring-slate-800" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.label}
                >
                  {accentColor === preset.hex && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                title="Custom color"
              />
            </div>
          </div>

          {/* Letterhead & Bill To Block Toggles */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block">
              2. Block Fields
            </span>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" /> Organization Header Fields
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: "businessName", label: "Business Name" },
                  { id: "address", label: "Physical Address" },
                  { id: "phone", label: "Phone Number" },
                  { id: "email", label: "Email Address" },
                ].map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={headerFields.includes(f.id)}
                      onChange={() => toggleHeaderField(f.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Billed To Client Fields
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: "name", label: "Client Name" },
                  { id: "email", label: "Client Email" },
                  { id: "phone", label: "Client Phone" },
                ].map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={billToFields.includes(f.id)}
                      onChange={() => toggleBillToField(f.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Table Columns & Tax Breakdown */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block">
              3. Itemized Table & Tax
            </span>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block flex items-center gap-1">
                <Table className="w-3.5 h-3.5 text-slate-500" /> Line Item Table Columns
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: "description", label: "Description" },
                  { id: "quantity", label: "Quantity" },
                  { id: "unitPrice", label: "Unit Price" },
                  { id: "amount", label: "Total Amount" },
                ].map((col) => (
                  <label key={col.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={lineItemColumns.includes(col.id)}
                      onChange={() => toggleLineItemColumn(col.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showTaxBreakdown}
                onChange={(e) => setShowTaxBreakdown(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">Show Tax Breakdown Row</span>
                <span className="text-[11px] text-slate-400">Display separate Sales Tax line item in totals box</span>
              </div>
            </label>
          </div>

          {/* Footer Notes Text */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Footer Terms & Notes Text
            </label>
            <textarea
              rows={3}
              value={footerNotes}
              onChange={(e) => setFooterNotes(e.target.value)}
              placeholder="e.g. Payment due in 14 days..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium"
            />
          </div>
        </div>

        {/* RIGHT PANE: Live Interactive Preview */}
        <div className="w-full lg:w-1/2 bg-slate-50 p-5 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Live Preview: {name}
            </span>
          </div>

          {/* Printable Sheet */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-6 text-xs text-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    M
                  </div>
                  <span className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {headerFields.includes("businessName") ? logoPlaceholder : ""}
                  </span>
                </div>
                {headerFields.includes("address") && (
                  <p className="text-[11px] text-slate-400">123 Health Tech Ave, Suite 400, New York, NY</p>
                )}
                {headerFields.includes("phone") && (
                  <p className="text-[11px] text-slate-400">Phone: +1 (800) 555-0199</p>
                )}
                {headerFields.includes("email") && (
                  <p className="text-[11px] text-slate-400">Email: billing@mantraassist.com</p>
                )}
              </div>

              <div className="text-right space-y-1">
                <h3
                  className="text-lg font-bold tracking-tight"
                  style={{ color: accentColor, fontFamily: "Outfit, sans-serif" }}
                >
                  {name.toUpperCase()}
                </h3>
                <span className="text-xs font-bold text-slate-600 block">{SAMPLE_INVOICE.id}</span>
                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded">
                  PAID
                </span>
              </div>
            </div>

            {/* Bill To Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Billed To
                </span>
                {billToFields.includes("name") && (
                  <span className="font-bold text-slate-900 block">{SAMPLE_INVOICE.clientName}</span>
                )}
                {billToFields.includes("email") && (
                  <span className="text-slate-500 block text-[11px]">{SAMPLE_INVOICE.clientEmail}</span>
                )}
                {billToFields.includes("phone") && (
                  <span className="text-slate-500 block text-[11px]">{SAMPLE_INVOICE.clientPhone}</span>
                )}
              </div>
              <div className="text-right text-[11px]">
                <p>
                  <span className="text-slate-400">Date:</span> <strong>{SAMPLE_INVOICE.createdAt}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Due:</span> <strong>{SAMPLE_INVOICE.dueDate}</strong>
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="text-white text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: accentColor }}>
                  <tr>
                    {lineItemColumns.includes("description") && <th className="py-2.5 px-3">Description</th>}
                    {lineItemColumns.includes("quantity") && <th className="py-2.5 px-3 text-center">Qty</th>}
                    {lineItemColumns.includes("unitPrice") && <th className="py-2.5 px-3 text-right">Price</th>}
                    {lineItemColumns.includes("amount") && <th className="py-2.5 px-3 text-right">Amount</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {SAMPLE_INVOICE.lineItems.map((item) => (
                    <tr key={item.id}>
                      {lineItemColumns.includes("description") && <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>}
                      {lineItemColumns.includes("quantity") && <td className="py-2.5 px-3 text-center">{item.quantity}</td>}
                      {lineItemColumns.includes("unitPrice") && <td className="py-2.5 px-3 text-right">${item.unitPrice.toFixed(2)}</td>}
                      {lineItemColumns.includes("amount") && <td className="py-2.5 px-3 text-right font-bold">${item.amount.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-1">
              <div className="w-60 space-y-1.5 text-xs bg-slate-50 p-3 border border-slate-200 rounded-xl">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">${SAMPLE_INVOICE.subtotal.toFixed(2)}</span>
                </div>
                {showTaxBreakdown && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (8%)</span>
                    <span>${SAMPLE_INVOICE.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-sm text-slate-900">
                  <span>Total Amount</span>
                  <span style={{ color: accentColor }}>${SAMPLE_INVOICE.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes */}
            {footerNotes && (
              <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400 italic">
                {footerNotes}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
