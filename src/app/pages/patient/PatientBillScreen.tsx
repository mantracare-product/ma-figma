import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  DollarSign,
  Clock,
  Sparkles,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../../app/types/invoiceTypes";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientBillScreen() {
  const navigate = useNavigate();
  const { activeClient, onStageChange } = useOutletContext<PortalContext>();

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => invoiceService.getInvoices());

  useEffect(() => {
    const unsub = invoiceService.subscribe(setInvoices);
    return unsub;
  }, []);

  // Find invoice for this client or generate default consultation invoice
  const clientInvoice = invoices.find(
    (inv) =>
      inv.clientId === activeClient?.id ||
      inv.clientName.toLowerCase() === activeClient?.name.toLowerCase()
  ) || {
    id: `INV-${activeClient?.id || "CL-001"}`,
    invoiceNumber: `INV-2026-${activeClient?.id?.replace(/\D/g, "") || "101"}`,
    clientId: activeClient?.id || "CL-001",
    clientName: activeClient?.name || "Sarah Johnson",
    clientEmail: activeClient?.email || "sarah@example.com",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: "sent" as const,
    subtotal: 195.0,
    tax: 15.6,
    total: 210.6,
    amountPaid: 0,
    lineItems: [
      {
        id: "li-consult",
        description: "Clinical Health Consultation",
        quantity: 1,
        unitPrice: 150.0,
      },
      {
        id: "li-pharm",
        description: "Prescription Medicines (Amoxicillin, Paracetamol, Vitamin D3)",
        quantity: 1,
        unitPrice: 45.0,
      },
    ],
  };

  const handleProceedToPayment = () => {
    // Navigate to /patient/pay
    navigate("/patient/pay");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold">
          <Receipt className="w-3.5 h-3.5 text-amber-600" />
          <span>Stage 4 of 5 • Pay Bill</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Invoice & Billing Summary
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Review your clinical consultation charges and pharmacy bill.
        </p>
      </div>

      {/* Invoice Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Invoice Top Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Invoice Identifier
            </span>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {clientInvoice.id}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                Payment Due
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Issued for: {clientInvoice.clientName} ({clientInvoice.clientId})
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Balance Due
            </span>
            <div className="text-2xl font-black text-slate-900">
              ${clientInvoice.total?.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Due Date: {clientInvoice.dueDate || "Immediate"}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Itemized Services & Medicines
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
            {clientInvoice.lineItems?.map((item: any, idx: number) => (
              <div key={item.id || idx} className="p-4 flex items-center justify-between text-xs bg-slate-50/40">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">{item.description}</div>
                  <div className="text-slate-400">Qty: {item.quantity || 1} • Unit Price: ${item.unitPrice?.toFixed(2)}</div>
                </div>
                <div className="font-bold text-slate-900">
                  ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown Totals */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>${clientInvoice.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Healthcare Tax (8%):</span>
              <span>${clientInvoice.tax?.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total Payable:</span>
              <span>${clientInvoice.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleProceedToPayment}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Proceed to Payment Screen (Stage 5)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Invoice stored in canonical mantra_invoices_v1 table</span>
          </div>
        </div>
      </div>
    </div>
  );
}
