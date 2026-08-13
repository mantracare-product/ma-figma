import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { InvoiceFieldRule, RequiredStage } from "../../types/invoiceTypes";
import { Settings2, Shield, Check, Info } from "lucide-react";

interface InvoiceFieldConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: InvoiceFieldRule;
  onSave: (updatedRule: InvoiceFieldRule) => void;
}

const MOCK_USERS = [
  { id: "u-1", name: "John Smith", role: "Senior Agent" },
  { id: "u-2", name: "Sarah Johnson", role: "Agent" },
  { id: "u-3", name: "Michael Chen", role: "Practitioner" },
  { id: "u-4", name: "Emily Davis", role: "Billing Admin" },
  { id: "u-5", name: "Admin User", role: "System Admin" },
];

export default function InvoiceFieldConfigModal({
  isOpen,
  onClose,
  rule,
  onSave,
}: InvoiceFieldConfigModalProps) {
  const [requiredAtStage, setRequiredAtStage] = useState<RequiredStage>(
    rule.requiredAtStage || "sent"
  );
  const [showAlways, setShowAlways] = useState<boolean>(rule.showAlways || false);
  const [enableTooltip, setEnableTooltip] = useState<boolean>(rule.enableTooltip || false);
  const [restrictUserVisibility, setRestrictUserVisibility] = useState<boolean>(
    (rule.visibleToUserIds && rule.visibleToUserIds.length > 0) || false
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    rule.visibleToUserIds || []
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = () => {
    onSave({
      ...rule,
      requiredAtStage,
      showAlways,
      enableTooltip,
      visibleToUserIds: restrictUserVisibility ? selectedUserIds : [],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-lg font-bold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Field Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Configure requirement stage and display rules for "{rule.fieldName}"
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
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Save Configuration
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Read-only Field Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Field Name
          </label>
          <input
            type="text"
            readOnly
            value={rule.fieldName}
            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed"
          />
        </div>

        {/* Required at stage dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Required at Stage
          </label>
          <select
            value={requiredAtStage}
            onChange={(e) => setRequiredAtStage(e.target.value as RequiredStage)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="sent">Sent (Required when finalizing / sending invoice)</option>
            <option value="draft">Draft (Required immediately on creation)</option>
            <option value="viewed">Viewed (Required once viewed by client)</option>
            <option value="paid">Paid (Required when payment is recorded)</option>
            <option value="never">Never (Optional field)</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Inline validation banner will appear under this field if left empty at or past the selected stage.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          {/* Show Always checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={showAlways}
              onChange={(e) => setShowAlways(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="font-bold text-slate-800 block text-xs group-hover:text-blue-600 transition-colors">
                Show Always
              </span>
              <span className="text-[11px] text-slate-400">
                Keep field permanently visible regardless of pipeline stage.
              </span>
            </div>
          </label>

          {/* Enable field tooltip checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={enableTooltip}
              onChange={(e) => setEnableTooltip(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="font-bold text-slate-800 block text-xs group-hover:text-blue-600 transition-colors">
                Enable Field Tooltip
              </span>
              <span className="text-[11px] text-slate-400">
                Show helper information icon next to the field label.
              </span>
            </div>
          </label>

          {/* Visibility restriction checkbox */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={restrictUserVisibility}
                onChange={(e) => {
                  setRestrictUserVisibility(e.target.checked);
                  if (e.target.checked && selectedUserIds.length === 0) {
                    setSelectedUserIds([MOCK_USERS[0].id]);
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-slate-800 block text-xs group-hover:text-blue-600 transition-colors">
                  Make this field visible to selected users only
                </span>
                <span className="text-[11px] text-slate-400">
                  Restrict viewing or editing of this field to specific team members.
                </span>
              </div>
            </label>

            {restrictUserVisibility && (
              <div className="ml-7 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Select Permitted Team Members:
                </span>
                {MOCK_USERS.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "bg-blue-50 text-blue-800 font-semibold border border-blue-200"
                          : "hover:bg-slate-100 text-slate-700 border border-transparent"
                      }`}
                    >
                      <div>
                        <span>{user.name}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {user.role}
                        </span>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
