import React, { useState, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList } from "../../../lib/getClientList";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredServices } from "../../../lib/servicesStore";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus } from "../../types/invoiceTypes";
import { toast } from "sonner";
import { addActivityEntry, getActivityForClient, ACTIVITY_LOG_EVENT } from "../../../lib/activityLog";
import { ACTIVITY_ENGINE_EVENT } from "../../../lib/activityEngine";
import InvoiceFieldConfigModal from "./InvoiceFieldConfigModal";
import InvoiceDocumentModal from "./InvoiceDocumentModal";
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
  History,
  FileCheck,
  Upload,
  CheckCircle2,
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
    getPaymentsByInvoice,
  } = useInvoices();
  const clientsList = getClientList();

  const [activeTab, setActiveTab] = useState<"general" | "history" | "documents">("general");

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
      taxPercent: MOCK_SERVICES[0].tax ?? 5,
    },
  ]);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Field config modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Document preview and receipt upload state
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isUploadReceiptOpen, setIsUploadReceiptOpen] = useState(false);
  const [uploadReceiptFileName, setUploadReceiptFileName] = useState("");
  const [activityEntries, setActivityEntries] = useState<any[]>([]);

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
      setActiveTab("general");
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
          taxPercent: MOCK_SERVICES[0].tax ?? 5,
        },
      ]);
      setDiscountType("amount");
      setDiscountValue(0);
      setPaymentMode("Bank Transfer");
      setValidationErrors({});
      setActiveTab("general");
    }
  }, [editingInvoice, isOpen]);

  // Load and sync client activity log entries
  useEffect(() => {
    if (selectedClientId) {
      const load = () => {
        const clientLogs = getActivityForClient(selectedClientId);
        setActivityEntries(clientLogs);
      };
      load();

      const handleUpdate = () => load();
      window.addEventListener(ACTIVITY_ENGINE_EVENT, handleUpdate);
      window.addEventListener(ACTIVITY_LOG_EVENT, handleUpdate);

      return () => {
        window.removeEventListener(ACTIVITY_ENGINE_EVENT, handleUpdate);
        window.removeEventListener(ACTIVITY_LOG_EVENT, handleUpdate);
      };
    }
  }, [selectedClientId, editingInvoice?.id]);

  const selectedClient = clientsList.find((c) => c.id === selectedClientId) || clientsList[0];

  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `li-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        source: "service",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxPercent: 5,
      },
    ]);
  };

  const handleDescriptionChange = (idx: number, val: string) => {
    const matched = MOCK_SERVICES.find(
      (s) => s.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      handleUpdateItem(idx, {
        description: matched.name,
        unitPrice: matched.price,
        taxPercent: matched.tax ?? 5,
        serviceId: matched.id,
      });
    } else {
      handleUpdateItem(idx, { description: val });
    }
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

  const taxAmount = parseFloat(
    lineItems
      .reduce((sum, item) => {
        const itemSub = Math.max(0, item.quantity * item.unitPrice - (item.discountAmount || 0));
        const effectiveDisc = subtotal > 0 ? discountAmount * (itemSub / subtotal) : 0;
        const taxableItem = Math.max(0, itemSub - effectiveDisc);
        const itemTax = (taxableItem * (item.taxPercent ?? 0)) / 100;
        return sum + itemTax;
      }, 0)
      .toFixed(2)
  );

  const taxableAmount = Math.max(0, subtotal - discountAmount);
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

  const pastPayments = editingInvoice ? getPaymentsByInvoice(editingInvoice.id) : [];

  const invoiceDocEntries = activityEntries.filter(
    (e) =>
      (editingInvoice && e.refId === editingInvoice.id) ||
      (e.details?.primary &&
        (e.details.primary.includes("Document generated") ||
          e.details.primary.includes("Receipt uploaded")))
  );

  const clientActivityLogs = activityEntries.filter(
    (e) =>
      !e.details?.primary?.includes("Document generated") &&
      !e.details?.primary?.includes("Receipt uploaded")
  );

  const historyCount = (editingInvoice ? 1 + pastPayments.length : 1) + clientActivityLogs.length;

  const previewInvoiceObject: ClientInvoice = {
    id: editingInvoice ? editingInvoice.id : "INV-DRAFT",
    clientId: selectedClient?.id || "c-1",
    clientName: selectedClient?.name || "Client",
    clientEmail: selectedClient?.email,
    clientPhone: selectedClient?.phoneNumber || (selectedClient as any)?.phone,
    status: status,
    currency: "$",
    lineItems,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxAmount,
    total: totalAmount,
    amountPaid: editingInvoice ? editingInvoice.amountPaid || 0 : 0,
    createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
    createdBy: editingInvoice ? editingInvoice.createdBy : "Staff User",
    dueDate: dueDate || new Date().toISOString().split("T")[0],
    paymentMode: paymentMode,
    paymentLinkUrl:
      editingInvoice?.paymentLinkUrl || "https://pay.mantraassist.mock/inv-preview",
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[70vw] w-full max-w-[70vw]"
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
      {/* Top Tab Bar: General | History | Documents */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-xs font-bold transition-all relative ${
              activeTab === "general"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "history"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
              {historyCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === "documents"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Documents
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
              {invoiceDocEntries.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col xl:flex-row gap-6 items-start min-h-0">
          {/* LEFT PANE: Form Inputs */}
          <div className="w-full xl:w-1/2 space-y-5 bg-white p-5 border border-slate-200 rounded-2xl shadow-xs overflow-y-auto max-h-[72vh]">
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
              <div className="border-b border-slate-100 pb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Product/Service Line Items
                </label>
              </div>

              {/* Datalist for fast auto-complete of service names */}
              <datalist id="services-datalist">
                {MOCK_SERVICES.map((s) => (
                  <option key={s.id} value={s.name}>
                    ${s.price}
                  </option>
                ))}
              </datalist>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <input
                      type="text"
                      list="services-datalist"
                      value={item.description}
                      onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                      placeholder="e.g. Initial Consultation, Therapy Session..."
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
                    <div className="w-20 flex items-center gap-1">
                      <span className="text-slate-400">Tax%:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.taxPercent ?? 0}
                        onChange={(e) => handleUpdateItem(idx, { taxPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-center py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions Footer under Line Items: Small Add button on left, Discount controls on right */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Item</span>
                </button>

                {/* Discount Control alternate in right corner */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-semibold text-slate-600">Discount:</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType("amount")}
                      className={`px-1.5 py-0.5 rounded-md transition-colors ${
                        discountType === "amount" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-1.5 py-0.5 rounded-md transition-colors ${
                        discountType === "percent" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-16 px-2 py-1 text-right border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {discountType === "percent" && (
                    <span className="text-xs font-bold text-emerald-600">
                      (-${discountAmount.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Live Document Preview */}
          <div className="w-full xl:w-1/2 bg-slate-50 p-5 border border-slate-200 rounded-2xl space-y-4 overflow-y-auto max-h-[72vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Live Document Preview
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Printable View</span>
              </button>
            </div>

            {/* Printable Live Invoice Card */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-6 text-xs text-slate-800 max-h-[58vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg text-white bg-blue-600 flex items-center justify-center font-bold text-sm">
                      M
                    </div>
                    <span className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      MantraAssist RCM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">123 Health Tech Ave, Suite 400</p>
                  <p className="text-[11px] text-slate-400">Phone: +1 (800) 555-0199 · Email: billing@mantraassist.com</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold block text-blue-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                    OFFICIAL INVOICE
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
                  <span className="font-bold text-slate-900 block text-xs mt-0.5">
                    {selectedClient?.name || "Select Client"}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedClient?.email || "No email"}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedClient?.phoneNumber || (selectedClient as any)?.phone || "No phone"}
                  </span>
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
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.description}</td>
                        <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
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
                  <div className="flex justify-between text-slate-600">
                    <span>Tax</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-300 font-bold text-sm text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400 italic">
                Payment is due within 14 days. Thank you for your business.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Section 1: Current Invoice Lifecycle & Draft Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invoice Status & Draft Timeline
              </h4>
              <span className="text-[11px] text-slate-400">
                {editingInvoice ? `Record ID: ${editingInvoice.id}` : "Live Draft Lifecycle"}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Draft Initiated / Active Step */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 block">
                      {editingInvoice ? "Invoice Editing Session" : "Invoice Draft Initiated"}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      Current Step
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Configured for <strong className="text-slate-900">{selectedClient?.name || "Client"}</strong> with{" "}
                    <strong>{lineItems.length} line items</strong> (${totalAmount.toFixed(2)} total).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Due Date: {dueDate || "Not set"}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Payment Mode: {paymentMode}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Status Target: {status.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* If editing existing invoice, show its past events */}
              {editingInvoice && (
                <>
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Invoice Created</span>
                      <span className="text-[11px] text-slate-500">
                        {editingInvoice.createdAt} · Created by {editingInvoice.createdBy}
                      </span>
                    </div>
                  </div>

                  {editingInvoice.sentAt && (
                    <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Sent via {editingInvoice.sentVia?.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-500">{editingInvoice.sentAt}</span>
                      </div>
                    </div>
                  )}

                  {pastPayments.map((p) => (
                    <div key={p.id} className="flex items-start justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          $
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Payment Recorded (+${p.amount.toFixed(2)})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.paymentDate} · Method: {p.method.replace("_", " ").toUpperCase()} {p.note ? `· ${p.note}` : ""}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        +${p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Section 2: Client Activity & Interaction History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Client History for {selectedClient?.name}
              </h4>
              <span className="text-[11px] text-slate-400">Account billing & engagement history</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              {clientActivityLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">No prior activity logs recorded for this client</p>
                  <p className="text-[11px]">Subsequent interactions, appointments, and payments will log automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clientActivityLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                          •
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {log.details?.primary || log.type.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {log.details?.secondary || log.processName || "Client Account Event"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {log.timestamp ? log.timestamp.split("T")[0] : "Recent"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Generated Documents & Uploaded Receipts
              </h4>
              <p className="text-[11px] text-slate-400">
                Attached receipts, generated documents, and files for {selectedClient?.name || "this invoice"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUploadReceiptOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> + Upload Receipt
              </button>
            </div>
          </div>

          {/* Documents Log Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {invoiceDocEntries.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Documents or Receipts Attached</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Use "+ Upload Receipt" above to attach payment receipts, proof files, or documents for this invoice.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document / File</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date Logged</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {invoiceDocEntries.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        {doc.type === "receipt_uploaded" ? (
                          <Upload className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span>{doc.details?.primary || "Invoice Document"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            doc.type === "receipt_uploaded"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {doc.type === "receipt_uploaded" ? "Receipt" : "Generated Doc"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {doc.timestamp ? doc.timestamp.split("T")[0] : "Today"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setIsDocumentModalOpen(true)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

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

      {/* Upload Receipt Modal */}
      {isUploadReceiptOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" /> Upload Receipt
              </h3>
              <button
                onClick={() => setIsUploadReceiptOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Attach an official receipt or proof of payment for this invoice (Client: <strong>{selectedClient?.name}</strong>).
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Receipt File Name / Title</label>
              <input
                type="text"
                placeholder="e.g. payment_receipt_08142026.pdf"
                value={uploadReceiptFileName}
                onChange={(e) => setUploadReceiptFileName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadReceiptOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fileName = uploadReceiptFileName.trim() || `Receipt_${Date.now()}.pdf`;
                  addActivityEntry({
                    clientId: selectedClientId,
                    processId: "billing",
                    processName: "Billing & Invoicing",
                    type: "receipt_uploaded",
                    status: "success",
                    refId: editingInvoice ? editingInvoice.id : "INV-DRAFT",
                    details: {
                      primary: `Receipt uploaded: ${fileName}`,
                      secondary: `Uploaded on ${new Date().toLocaleDateString()} · ${selectedClient?.name || "Client"}`,
                    },
                  });
                  toast.success(`Receipt "${fileName}" uploaded successfully!`);
                  setUploadReceiptFileName("");
                  setIsUploadReceiptOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Document Modal */}
      {isDocumentModalOpen && (
        <InvoiceDocumentModal
          isOpen={isDocumentModalOpen}
          onClose={() => setIsDocumentModalOpen(false)}
          invoice={previewInvoiceObject}
        />
      )}
    </CustomSideDrawer>
  );
}
