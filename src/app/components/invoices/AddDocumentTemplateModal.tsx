import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface AddDocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTemplate: (templateName: string) => void;
}

export default function AddDocumentTemplateModal({
  isOpen,
  onClose,
  onAddTemplate,
}: AddDocumentTemplateModalProps) {
  const [templateName, setTemplateName] = useState("");

  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    onAddTemplate(templateName.trim());
    toast.success(`Template "${templateName.trim()}" created!`);
    setTemplateName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-lg font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Add Document Template
            </h3>
            <p className="text-xs text-slate-500">
              Create a new session template definition
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
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-4 h-4" /> Save Template
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Template Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Hospital Receipt A5, Discharge Summary"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <p className="text-[11px] text-slate-400">
          This template will be added to the document action menu for the current session.
        </p>
      </div>
    </Modal>
  );
}
