/**
 * AddForwardingRuleModal.tsx
 * Path: src/app/components/chats/AddForwardingRuleModal.tsx
 *
 * Modal for creating and editing Email Forwarding Rules
 */

import React, { useState } from "react";
import { X, Send, Plus, Check } from "lucide-react";
import { Modal } from "../ui/Modal";
import { ForwardingRule } from "../../../lib/emailAgentStore";
import { toast } from "sonner";

interface AddForwardingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRule: (rule: Omit<ForwardingRule, "id">) => void;
}

export default function AddForwardingRuleModal({
  isOpen,
  onClose,
  onAddRule,
}: AddForwardingRuleModalProps) {
  const [name, setName] = useState("");
  const [conditionField, setConditionField] = useState<ForwardingRule["conditionField"]>("from");
  const [conditionOperator, setConditionOperator] = useState<ForwardingRule["conditionOperator"]>("contains");
  const [conditionValue, setConditionValue] = useState("");
  const [forwardTo, setForwardTo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionValue.trim()) {
      toast.error("Please enter a condition value");
      return;
    }
    if (!forwardTo.trim() || !forwardTo.includes("@")) {
      toast.error("Please enter a valid forwarding email address");
      return;
    }

    onAddRule({
      name: name.trim() || `Forward ${conditionField} "${conditionValue.trim()}"`,
      conditionField,
      conditionOperator,
      conditionValue: conditionValue.trim(),
      forwardTo: forwardTo.trim().toLowerCase(),
      enabled: true,
    });

    toast.success("Forwarding rule created");
    setName("");
    setConditionValue("");
    setForwardTo("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Forwarding Rule"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-slate-800 text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
        <p className="text-gray-500 text-[11px]">
          Define when incoming emails should be automatically forwarded to another department or email address.
        </p>

        <div>
          <label className="block font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Rule Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Forward Billing Inquiries to Accounting"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Condition Field
            </label>
            <select
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="from">Sender Email (From)</option>
              <option value="domain">Sender Domain</option>
              <option value="subject">Subject Line</option>
              <option value="body">Email Body</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Operator
            </label>
            <select
              value={conditionOperator}
              onChange={(e) => setConditionOperator(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="contains">Contains</option>
              <option value="equals">Exact match</option>
              <option value="ends_with">Ends with</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Matches Value *
          </label>
          <input
            type="text"
            required
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            placeholder={conditionField === "domain" ? "@example.com" : conditionField === "subject" ? "Urgent / Invoice" : "partner@clinic.org"}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Forward Email To *
          </label>
          <input
            type="email"
            required
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="accounting@mantra.care"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-700 hover:bg-slate-50 transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
