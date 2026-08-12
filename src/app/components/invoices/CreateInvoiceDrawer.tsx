import React, { useState } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList, ClientItem } from "../../../lib/getClientList";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { InvoiceLineItem } from "../../types/invoiceTypes";
import { toast } from "sonner";
import {
  FileText,
  User,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  DollarSign,
} from "lucide-react";

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateInvoiceDrawer({ isOpen, onClose }: CreateInvoiceDrawerProps) {
  const { createInvoiceFromAppointment } = useInvoices();
  const clientsList = getClientList();

  const [selectedClientId, setSelectedClientId] = useState<string>(clientsList[0]?.id || "c-1");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

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
  const [discountAmount, setDiscountAmount] = useState<number>(0);

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

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = parseFloat((taxableAmount * 0.08).toFixed(2));
  const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

  const handleSave = () => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

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
        discountAmount,
        dueDate,
      }
    );

    toast.success(`Standalone invoice ${created.id} generated!`);
    onClose();
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[560px]"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Create Standalone Invoice
            </h3>
            <p className="text-xs text-slate-500">Generate a direct client invoice without an appointment link</p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Save & Generate Invoice
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Client Selection */}
        <div className="space-y-2">
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
          {selectedClient && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">{selectedClient.name}</span>
                <span>{selectedClient.email}</span>
              </div>
              <div className="text-right">
                <span className="block">{selectedClient.phoneNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Due Date Picker */}
        <div className="space-y-2">
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

        {/* Line Items Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Line Items
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
                <option value="">+ Add Service Item...</option>
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

        {/* Discount Field */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-semibold text-slate-700">Discount Amount ($)</span>
          <input
            type="number"
            min={0}
            value={discountAmount}
            onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-28 px-3 py-1.5 text-right border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Financial Calculations Summary */}
        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2 text-xs text-slate-700">
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
          <div className="flex justify-between">
            <span>Tax (8%)</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-blue-200 text-base font-bold text-slate-900">
            <span>Total Invoice Amount</span>
            <span className="text-blue-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </CustomSideDrawer>
  );
}
