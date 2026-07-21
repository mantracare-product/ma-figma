import React, { useState, useEffect } from "react";
import { X, Copy, Check, ShieldCheck, Send } from "lucide-react";
import { WhatsappTemplate } from "../../pages/Chats";
import { Button } from "../ui/Button";

interface RequestTemplateApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WhatsappTemplate | null;
  onSubmit: (templateId: string, patch: Partial<WhatsappTemplate>) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
    >
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function RequestTemplateApprovalModal({
  isOpen,
  onClose,
  template,
  onSubmit,
}: RequestTemplateApprovalModalProps) {
  const [metaTemplateId, setMetaTemplateId] = useState("");

  useEffect(() => {
    if (!isOpen || !template) return;
    // Use existing metaTemplateId or auto-generate a new one
    setMetaTemplateId(template.metaTemplateId || `tpl_${Date.now()}`);
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const handleSubmit = () => {
    const patch: Partial<WhatsappTemplate> = {
      approvalStatus: "pending",
      metaTemplateId,
      submittedAt: new Date().toISOString(),
    };
    onSubmit(template.id, patch);
    onClose();
  };

  const isAlreadyApproved = template.approvalStatus === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Request Template Approval
              </h3>
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Submit this template to Meta for review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Template Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Template Name
            </label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {template.name}
            </div>
          </div>

          {/* Template Identifier */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Template Identifier
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700">
              {template.identifier}
            </div>
          </div>

          {/* Meta Template ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Meta Template ID
              </label>
              <CopyButton text={metaTemplateId} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl">
              <code className="flex-1 text-xs font-mono text-green-400 select-all">
                {metaTemplateId}
              </code>
            </div>
            <p className="text-[10px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              This ID will be assigned to the template upon submission and used to track approval status with Meta.
            </p>
          </div>

          {/* Category + Submission Note */}
          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-amber-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Category: {template.category}
            </p>
            <p className="text-[11px] text-amber-700 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              Submitting will send this template for Meta's review. Approval typically takes 24–48 hours. You'll see the status update in the Templates table.
            </p>
          </div>

          {isAlreadyApproved && (
            <div className="p-3.5 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs font-semibold text-green-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                This template is already approved.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isAlreadyApproved}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
