import React, { useState, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList } from "../../../lib/getClientList";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredServices } from "../../../lib/servicesStore";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus } from "../../types/invoiceTypes";
import { toast } from "sonner";
import InvoiceFieldConfigModal from "./InvoiceFieldConfigModal";
import { hasInvoiceAutomation } from "../../../lib/invoiceService";
import { Link } from "react-router";
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
  Send,
  Sparkles,
} from "lucide-react";

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvoice?: ClientInvoice | null;
  prefillClientId?: string;
  prefillClientName?: string;
  prefillAppointmentId?: string | number;
  prefillAppointmentTitle?: string;
}

const DEFAULT_PAYMENT_MODES = ["Bank Transfer", "Card", "Cash", "Insurance-EMI"];

export default function CreateInvoiceDrawer({
  isOpen,
  onClose,
  editingInvoice,
  prefillClientId,
  prefillClientName,
  prefillAppointmentId,
  prefillAppointmentTitle,
}: CreateInvoiceDrawerProps) {
  const {
    createInvoiceFromAppointment,
    updateInvoice,
    fieldRules,
    getClientCredit,
  } = useInvoices();
  const clientsList = getClientList();

  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (prefillClientId) {
      const match = clientsList.find((c) => c.id === prefillClientId || c.name === prefillClientName);
      if (match) return match.id;
    }
    return clientsList[0]?.id || "c-1";
  });
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
          taxPercent: MOCK_SERVICES[0].tax ?? 5,
        },
      ]);
      setDiscountType("amount");
      setDiscountValue(0);
      setPaymentMode("Bank Transfer");
      setValidationErrors({});
    }
  }, [editingInvoice, isOpen]);

  const selectedClient = clientsList.find((c) => c.id === selectedClientId) || clientsList[0];
  const availableClientCredit = getClientCredit(selectedClientId);

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
    const allServices = [...getStoredServices(), ...MOCK_SERVICES];
    const matched = allServices.find(
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

  // Inline Validation
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
    if (!editingInvoice && !hasInvoiceAutomation()) {
      toast.error("Cannot create invoice: Please build the automation first in Automation.");
      return;
    }
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

    const calculatedStatus: InvoiceStatus = finalStatus;

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phoneNumber,
        status: calculatedStatus,
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

      if (calculatedStatus !== "draft") {
        updateInvoice(created.id, { status: calculatedStatus });
      }
      toast.success(`Invoice ${created.id} generated!`);
    }
    onClose();
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-2xl w-full max-w-2xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {editingInvoice ? `Edit Invoice ${editingInvoice.id}` : "Create Standalone Invoice"}
                </h3>
                {availableClientCredit > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-600" /> Credit Available: ${availableClientCredit.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Enter invoice details, client coordinates, and itemized services
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            {validationErrors.paymentMode ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Required field error in form
              </span>
            ) : totalAmount > 0 ? (
              <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                Total Due: ${totalAmount.toFixed(2)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={!editingInvoice && !hasInvoiceAutomation()}
              className={`px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold transition-all ${
                !editingInvoice && !hasInvoiceAutomation() ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 cursor-pointer"
              }`}
              title={!editingInvoice && !hasInvoiceAutomation() ? "Please build the automation first" : undefined}
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("sent")}
              disabled={!editingInvoice && !hasInvoiceAutomation()}
              className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                !editingInvoice && !hasInvoiceAutomation() ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
              title={!editingInvoice && !hasInvoiceAutomation() ? "Please build the automation first" : undefined}
            >
              <Send className="w-4 h-4" /> Save & Send Invoice
            </button>
          </div>
        </div>
      }
    >
      {!editingInvoice && !hasInvoiceAutomation() && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-medium text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Invoice creation is locked — please build the automation first in the Automation page.
          </span>
          <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
            Build automation &rarr;
          </Link>
        </div>
      )}

      {/* Single Column Form Inputs */}
      <div className="space-y-5 bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Invoice Details
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
              Product/Service Line Items
            </label>
          </div>

          {/* Datalist for fast auto-complete of service names */}
          <datalist id="services-datalist">
            {[...getStoredServices(), ...MOCK_SERVICES].map((s) => (
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

          {/* Actions Footer under Line Items */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Item</span>
            </button>

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

        {/* Financial Summary Card */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Estimated Tax</span>
            <span className="font-semibold text-slate-900">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>Total Amount Due</span>
            <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <InvoiceFieldConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </CustomSideDrawer>
  );
}
