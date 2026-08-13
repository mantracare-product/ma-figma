import React, { useState, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList, ClientItem } from "../../../lib/getClientList";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus } from "../../types/invoiceTypes";
import { toast } from "sonner";
import { addActivityEntry } from "../../../lib/activityLog";
import InvoiceFieldConfigModal from "./InvoiceFieldConfigModal";
import AddDocumentTemplateModal from "./AddDocumentTemplateModal";
import AddInvoiceTemplateDrawer from "./AddInvoiceTemplateDrawer";
import {
  FileText,
  User,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  DollarSign,
  Settings2,
  AlertCircle,
  CreditCard,
  Printer,
  Send,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvoice?: ClientInvoice | null;
}

const DEFAULT_PAYMENT_MODES = ["Bank Transfer", "Card", "Cash", "Insurance-EMI"];
const DEFAULT_DOC_TEMPLATES = ["Receipt", "Invoice Copy", "Payment Confirmation"];

export default function CreateInvoiceDrawer({
  isOpen,
  onClose,
  editingInvoice,
}: CreateInvoiceDrawerProps) {
  const {
    createInvoiceFromAppointment,
    updateInvoice,
    fieldRules,
    updateFieldRule,
    invoiceTemplates,
    getDefaultTemplate,
  } = useInvoices();
  const clientsList = getClientList();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => getDefaultTemplate().id
  );
  const activeTemplate =
    invoiceTemplates.find((t) => t.id === selectedTemplateId) || getDefaultTemplate();

  const [selectedClientId, setSelectedClientId] = useState<string>(clientsList[0]?.id || "c-1");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [status, setStatus] = useState<InvoiceStatus>("draft");

  const [paymentMode, setPaymentMode] = useState<string>("Bank Transfer");
  const [customModes, setCustomModes] = useState<string[]>([]);
  const [isAddingCustomMode, setIsAddingCustomMode] = useState(false);
  const [newModeInput, setNewModeInput] = useState("");

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: "li-init-1",
      source: "service",
      serviceId: MOCK_SERVICES[0].id,
      description: MOCK_SERVICES[0].name,
      quantity: 1,
      unitPrice: MOCK_SERVICES[0].price,
    },
  ]);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Field config modal & template drawer state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAddInvoiceTemplateDrawerOpen, setIsAddInvoiceTemplateDrawerOpen] = useState(false);

  // Document templates state
  const [docTemplates, setDocTemplates] = useState<string[]>(DEFAULT_DOC_TEMPLATES);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);

  // Inline validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingInvoice) {
      setSelectedClientId(editingInvoice.clientId || clientsList[0]?.id || "c-1");
      setDueDate(editingInvoice.dueDate || new Date().toISOString().split("T")[0]);
      setStatus(editingInvoice.status || "draft");
      setLineItems(editingInvoice.lineItems || []);
      setDiscountType(editingInvoice.discountType || "amount");
      setDiscountValue(editingInvoice.discountValue || editingInvoice.discountAmount || 0);
      setPaymentMode(editingInvoice.paymentMode || "Bank Transfer");
      setValidationErrors({});
    } else {
      setSelectedClientId(clientsList[0]?.id || "c-1");
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().split("T")[0]);
      setStatus("draft");
      setLineItems([
        {
          id: "li-init-1",
          source: "service",
          serviceId: MOCK_SERVICES[0].id,
          description: MOCK_SERVICES[0].name,
          quantity: 1,
          unitPrice: MOCK_SERVICES[0].price,
        },
      ]);
      setDiscountType("amount");
      setDiscountValue(0);
      setPaymentMode("Bank Transfer");
      setValidationErrors({});
    }
  }, [editingInvoice, isOpen]);

  const selectedClient = clientsList.find((c) => c.id === selectedClientId) || clientsList[0];

  const handleAddServiceItem = (serviceId: string) => {
    const service = MOCK_SERVICES.find((s) => s.id === serviceId);
    if (!service) return;

    setLineItems((prev) => [
      ...prev,
      {
        id: `li-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        source: "service",
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: service.price,
      },
    ]);
  };

  const handleAddManualItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `li-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        source: "manual",
        description: "Custom Service / Consultation Fee",
        quantity: 1,
        unitPrice: 50,
      },
    ]);
  };

  const handleUpdateItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice - (item.discountAmount || 0)),
    0
  );
  const discountAmount =
    discountType === "percent"
      ? parseFloat(((subtotal * discountValue) / 100).toFixed(2))
      : discountValue;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = parseFloat((taxableAmount * 0.08).toFixed(2));
  const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

  const handleAddCustomMode = () => {
    if (!newModeInput.trim()) return;
    const trimmed = newModeInput.trim();
    if (!customModes.includes(trimmed) && !DEFAULT_PAYMENT_MODES.includes(trimmed)) {
      setCustomModes((prev) => [...prev, trimmed]);
    }
    setPaymentMode(trimmed);
    setNewModeInput("");
    setIsAddingCustomMode(false);
    setValidationErrors((prev) => ({ ...prev, paymentMode: "" }));
  };

  // Check required field engine rule
  const validateForm = (targetStatus: InvoiceStatus = status): boolean => {
    const errors: Record<string, string> = {};
    const pmRule = fieldRules.paymentMode || {
      fieldKey: "paymentMode",
      fieldName: "Payment mode",
      requiredAtStage: "sent",
      showAlways: false,
      enableTooltip: false,
      visibleToUserIds: [],
    };

    // Stage order evaluation: draft = 1, sent = 2, viewed = 3, paid = 4
    const STAGE_ORDER: Record<string, number> = {
      draft: 1,
      sent: 2,
      viewed: 3,
      paid: 4,
      never: 99,
    };

    const reqStage = pmRule.requiredAtStage;
    if (reqStage !== "never") {
      const currentOrder = STAGE_ORDER[targetStatus] || 1;
      const reqOrder = STAGE_ORDER[reqStage] || 2;

      if (currentOrder >= reqOrder && (!paymentMode || paymentMode.trim() === "")) {
        errors.paymentMode = "The field 'Payment mode' is required";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = (finalStatus: InvoiceStatus = status) => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    if (!validateForm(finalStatus)) {
      toast.error("Please fill in all required fields before proceeding.");
      return;
    }

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phoneNumber,
        status: finalStatus,
        lineItems,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxAmount,
        total: totalAmount,
        dueDate,
        paymentMode,
      });
      toast.success(`Invoice ${editingInvoice.id} updated!`);
    } else {
      const created = createInvoiceFromAppointment(
        {
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          clientEmail: selectedClient.email,
          clientPhone: selectedClient.phoneNumber,
        },
        lineItems,
        {
          createdBy: "Admin User",
          discountType,
          discountValue,
          discountAmount,
          dueDate,
          paymentMode,
        }
      );
      if (finalStatus !== "draft") {
        updateInvoice(created.id, { status: finalStatus });
      }
      toast.success(`Invoice ${created.id} generated!`);
    }
    onClose();
  };

  const handleGenerateDocument = (templateName: string) => {
    toast.success(`Document generated: ${templateName}`);
    if (selectedClient) {
      addActivityEntry({
        clientId: selectedClient.id,
        processId: "billing",
        processName: "Billing & Invoicing",
        type: "field_update",
        status: "success",
        refId: editingInvoice?.id || "INV-NEW",
        details: {
          primary: `Document generated (${templateName})`,
          secondary: `Template: ${templateName} · Client: ${selectedClient.name}`,
        },
      });
    }
    setIsDocMenuOpen(false);
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[70vw]"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {editingInvoice ? `Edit Invoice ${editingInvoice.id}` : "Create Standalone Invoice"}
              </h3>
              <p className="text-xs text-slate-500">
                Live split-view creation with real-time printable document preview
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            {validationErrors.paymentMode && (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Required field error in form
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave("draft")}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("sent")}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Send className="w-4 h-4" /> Save & Send Invoice
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col xl:flex-row gap-6 items-start min-h-0">
        {/* LEFT PANE: Form Inputs */}
        <div className="w-full xl:w-1/2 space-y-5 bg-white p-5 border border-slate-200 rounded-2xl shadow-xs overflow-y-auto max-h-[78vh]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Invoice Details
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              Status: {status.toUpperCase()}
            </span>
          </div>

          {/* Client Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email || c.phoneNumber || "No contact info"})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date & Payment Mode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Due Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Mode Field with Gear Icon */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  Payment Mode
                  {fieldRules.paymentMode?.requiredAtStage !== "never" && (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Configure required field rule"
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isAddingCustomMode ? (
                <select
                  value={paymentMode}
                  onChange={(e) => {
                    if (e.target.value === "__add_new__") {
                      setIsAddingCustomMode(true);
                    } else {
                      setPaymentMode(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, paymentMode: "" }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
                    validationErrors.paymentMode
                      ? "border-rose-400 focus:ring-rose-400 text-rose-900 bg-rose-50/20"
                      : "border-slate-200 focus:ring-blue-500 text-slate-800"
                  }`}
                >
                  <option value="">-- Select Payment Mode --</option>
                  {DEFAULT_PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                  {customModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode} (Custom)
                    </option>
                  ))}
                  <option value="__add_new__">+ Add custom payment mode...</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type new payment mode..."
                    value={newModeInput}
                    onChange={(e) => setNewModeInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-blue-400 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMode}
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomMode(false)}
                    className="px-2.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Exact inline validation banner pattern matching Reference Image 1 */}
              {validationErrors.paymentMode && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 mt-1.5 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{validationErrors.paymentMode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Product/Service Line Items
              </label>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddServiceItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <option value="">+ Add Product/Service Item...</option>
                  {MOCK_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.price})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Manual Row
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                    placeholder="Item description"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="w-16 flex items-center gap-1">
                    <span className="text-slate-400">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div className="w-20 flex items-center gap-1">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-right py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Discount & Totals */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Discount</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDiscountType("amount")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    discountType === "amount" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("percent")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    discountType === "percent" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-3 py-1.5 text-right border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {discountType === "percent" && (
                <span className="text-xs font-bold text-emerald-600">
                  (-${discountAmount.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Document Preview */}
        <div className="w-full xl:w-1/2 bg-slate-50 p-5 border border-slate-200 rounded-2xl space-y-4 overflow-y-auto max-h-[78vh]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Document Preview
              </span>
            </div>

            {/* Real Invoice Template Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDocMenuOpen(!isDocMenuOpen)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeTemplate.accentColor }}
                />
                <span>{activeTemplate.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isDocMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDocMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 z-20 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Select Invoice Template
                    </div>
                    {invoiceTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setIsDocMenuOpen(false);
                          toast.success(`Applied template: ${tpl.name}`);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 font-semibold transition-colors flex items-center justify-between ${
                          tpl.id === activeTemplate.id ? "bg-blue-50 text-blue-700" : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: tpl.accentColor }}
                          />
                          <span>{tpl.name}</span>
                        </div>
                        {tpl.isDefault && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                            Default
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDocMenuOpen(false);
                        setIsAddInvoiceTemplateDrawerOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 font-bold text-blue-600 transition-colors flex items-center gap-2 border-t border-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Create New Template
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Printable Live Invoice Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-6 text-xs text-slate-800 max-h-[62vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: activeTemplate.accentColor }}
                  >
                    M
                  </div>
                  <span className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {activeTemplate.headerFields.includes("businessName") ? (activeTemplate.logoPlaceholder || "MantraAssist RCM") : ""}
                  </span>
                </div>
                {activeTemplate.headerFields.includes("address") && (
                  <p className="text-[11px] text-slate-400 pt-1">123 Health Tech Ave, Suite 400</p>
                )}
                {activeTemplate.headerFields.includes("phone") && (
                  <p className="text-[11px] text-slate-400">Phone: +1 (800) 555-0199</p>
                )}
                {activeTemplate.headerFields.includes("email") && (
                  <p className="text-[11px] text-slate-400">Email: billing@mantraassist.com</p>
                )}
              </div>

              <div className="text-right">
                <span
                  className="text-xs font-bold block"
                  style={{ color: activeTemplate.accentColor, fontFamily: "Outfit, sans-serif" }}
                >
                  {activeTemplate.name.toUpperCase()}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {editingInvoice ? editingInvoice.id : "INV-PREVIEW"}
                </span>
                <span className="block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                  {status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Billed To
                </span>
                {activeTemplate.billToFields.includes("name") && (
                  <span className="font-bold text-slate-900 block text-xs mt-0.5">
                    {selectedClient?.name || "Select Client"}
                  </span>
                )}
                {activeTemplate.billToFields.includes("email") && (
                  <span className="text-slate-500 block text-[11px]">
                    {selectedClient?.email || "No email"}
                  </span>
                )}
                {activeTemplate.billToFields.includes("phone") && (
                  <span className="text-slate-500 block text-[11px]">
                    {selectedClient?.phoneNumber || (selectedClient as any)?.phone || "No phone"}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Due Date
                </span>
                <span className="font-bold text-slate-800 block text-xs mt-0.5">
                  {dueDate || "Not set"}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Payment Mode: <strong className="text-slate-800">{paymentMode || "Not set"}</strong>
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead
                  className="text-white text-[10px] uppercase font-bold tracking-wider"
                  style={{ backgroundColor: activeTemplate.accentColor }}
                >
                  <tr>
                    {activeTemplate.lineItemColumns.includes("description") && <th className="py-2 px-3">Description</th>}
                    {activeTemplate.lineItemColumns.includes("quantity") && <th className="py-2 px-3 text-center">Qty</th>}
                    {activeTemplate.lineItemColumns.includes("unitPrice") && <th className="py-2 px-3 text-right">Price</th>}
                    {activeTemplate.lineItemColumns.includes("amount") && <th className="py-2 px-3 text-right">Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      {activeTemplate.lineItemColumns.includes("description") && <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>}
                      {activeTemplate.lineItemColumns.includes("quantity") && <td className="py-2.5 px-3 text-center">{item.quantity}</td>}
                      {activeTemplate.lineItemColumns.includes("unitPrice") && <td className="py-2.5 px-3 text-right">${item.unitPrice.toFixed(2)}</td>}
                      {activeTemplate.lineItemColumns.includes("amount") && (
                        <td className="py-2.5 px-3 text-right font-bold">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end pt-1">
              <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 border border-slate-200 rounded-xl">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {activeTemplate.showTaxBreakdown && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (8%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-sm text-slate-900">
                  <span>Total Amount</span>
                  <span style={{ color: activeTemplate.accentColor }}>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>


            {/* Footer Notes */}
            {activeTemplate.footerNotes && (
              <div className="border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400 italic">
                {activeTemplate.footerNotes}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Field Configuration Modal */}
      {isConfigModalOpen && (
        <InvoiceFieldConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          rule={
            fieldRules.paymentMode || {
              fieldKey: "paymentMode",
              fieldName: "Payment mode",
              requiredAtStage: "sent",
              showAlways: false,
              enableTooltip: false,
              visibleToUserIds: [],
            }
          }
          onSave={(updatedRule) => {
            updateFieldRule(updatedRule);
            toast.success("Field configuration saved!");
          }}
        />
      )}

      {/* Add Document Template Modal */}
      {isAddTemplateModalOpen && (
        <AddDocumentTemplateModal
          isOpen={isAddTemplateModalOpen}
          onClose={() => setIsAddTemplateModalOpen(false)}
          onAddTemplate={(newTemplateName) => {
            if (!docTemplates.includes(newTemplateName)) {
              setDocTemplates((prev) => [...prev, newTemplateName]);
            }
          }}
        />
      )}

      {/* Add Invoice Template Drawer */}
      {isAddInvoiceTemplateDrawerOpen && (
        <AddInvoiceTemplateDrawer
          isOpen={isAddInvoiceTemplateDrawerOpen}
          onClose={() => setIsAddInvoiceTemplateDrawerOpen(false)}
          onTemplateSaved={(tpl) => {
            setSelectedTemplateId(tpl.id);
          }}
        />
      )}
    </CustomSideDrawer>
  );
}
