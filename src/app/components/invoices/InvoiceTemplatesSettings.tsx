import React, { useState } from "react";
import { useInvoices } from "../../context/InvoiceContext";
import { InvoiceTemplate } from "../../types/invoiceTypes";
import InvoiceTemplateBuilderModal from "./InvoiceTemplateBuilderModal";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  CheckCircle2,
  Pencil,
  Trash2,
  Sparkles,
  Layout,
  Palette,
} from "lucide-react";

export default function InvoiceTemplatesSettings() {
  const {
    invoiceTemplates,
    saveInvoiceTemplate,
    deleteInvoiceTemplate,
    setDefaultInvoiceTemplate,
  } = useInvoices();

  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const handleOpenBuilder = (template?: InvoiceTemplate) => {
    setEditingTemplate(template || null);
    setIsBuilderOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    deleteInvoiceTemplate(id);
    toast.success(`Template "${name}" deleted`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Invoice Templates & Branding
            </h3>
            <p className="text-xs text-slate-500">
              Configure structured invoice document templates, accent colors, and printable field layouts
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenBuilder()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Plus className="w-4 h-4" /> + New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoiceTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className={`p-5 bg-white border rounded-2xl space-y-4 transition-all relative flex flex-col justify-between ${
              tpl.isDefault ? "border-blue-400 ring-2 ring-blue-100 shadow-sm" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tpl.accentColor }}
                  />
                  <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                </div>

                {tpl.isDefault && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Default
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Header Fields:</span>
                  <span className="font-semibold text-slate-800">{tpl.headerFields.length} active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Table Columns:</span>
                  <span className="font-semibold text-slate-800">{tpl.lineItemColumns.length} columns</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Tax Breakdown:</span>
                  <span className={`font-semibold ${tpl.showTaxBreakdown ? "text-emerald-600" : "text-slate-400"}`}>
                    {tpl.showTaxBreakdown ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {tpl.footerNotes && (
                <p className="text-[11px] text-slate-400 italic line-clamp-2">
                  "{tpl.footerNotes}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              {!tpl.isDefault ? (
                <button
                  onClick={() => {
                    setDefaultInvoiceTemplate(tpl.id);
                    toast.success(`"${tpl.name}" set as default template`);
                  }}
                  className="text-blue-600 hover:underline font-bold text-xs"
                >
                  Set as Default
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-semibold">Current Default</span>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenBuilder(tpl)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                  title="Edit Template"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {!tpl.isDefault && (
                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Builder Modal */}
      {isBuilderOpen && (
        <InvoiceTemplateBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          initialTemplate={editingTemplate}
          onSave={(template) => {
            saveInvoiceTemplate(template);
          }}
        />
      )}
    </div>
  );
}
