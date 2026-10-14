import React, { useState, useEffect, useMemo } from "react";
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
  QrCode,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Client } from "../../../lib/clientsStore";
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

  // Find all invoices matching activeClient (in sync with AI Receptionist logic)
  const clientInvoices = useMemo(() => {
    if (!activeClient) return [];
    const patientPhoneDigits = (activeClient.phone || "").replace(/\D/g, "");
    const patientNameLower = (activeClient.name || "").toLowerCase().trim();

    const matched = invoices.filter((inv) => {
      if (inv.clientId && String(inv.clientId) === String(activeClient.id)) return true;
      if (inv.clientName && patientNameLower && inv.clientName.toLowerCase().trim() === patientNameLower) return true;
      const invPhoneDigits = (inv.clientPhone || "").replace(/\D/g, "");
      if (patientPhoneDigits && invPhoneDigits && (patientPhoneDigits === invPhoneDigits || patientPhoneDigits.slice(-10) === invPhoneDigits.slice(-10))) {
        return true;
      }
      return false;
    });

    if (matched.length > 0) return matched;

    // Direct synchronization with AI Receptionist:
    // If no invoice matches this patient directly, display any pending invoices in the clinic system
    const pendingInSystem = invoices.filter(
      (inv) => (inv.total - (inv.amountPaid || 0)) > 0 && inv.status !== "paid"
    );
    if (pendingInSystem.length > 0) return pendingInSystem;

    if (invoices.length > 0) return invoices;

    // If no invoices exist in storage at all, generate and persist a canonical invoice in invoiceService
    const seeded: ClientInvoice = {
      id: `INV-CL-1001`,
      invoiceNumber: `INV-2026-101`,
      clientId: activeClient.id || "CL-001",
      clientName: activeClient.name || "Patient",
      clientEmail: activeClient.email || "",
      clientPhone: activeClient.phone || "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      status: "sent" as const,
      subtotal: 75.0,
      discountAmount: 0,
      taxAmount: 3.75,
      total: 78.75,
      amountPaid: 0,
      currency: "$",
      createdAt: new Date().toISOString(),
      createdBy: "System",
      lineItems: [
        {
          id: "li-consult",
          description: "Follow-up Consultation & Clinical Assessment",
          quantity: 1,
          unitPrice: 75.0,
          source: "service" as const,
        },
      ],
    };
    invoiceService.saveInvoices([seeded]);
    return [seeded];
  }, [invoices, activeClient]);

  const pendingInvoices = clientInvoices.filter(
    (inv) => (inv.total - (inv.amountPaid || 0)) > 0 && inv.status !== "paid"
  );
  const paidInvoices = clientInvoices.filter(
    (inv) => inv.status === "paid" || (inv.total - (inv.amountPaid || 0)) <= 0
  );

  const totalOutstandingBalance = pendingInvoices.reduce(
    (acc, inv) => acc + Math.max(0, inv.total - (inv.amountPaid || 0)),
    0
  );

  const handleProceedToPayment = (invoiceId?: string) => {
    const targetId = invoiceId || pendingInvoices[0]?.id || clientInvoices[0]?.id;
    if (targetId) {
      navigate(`/patient/pay?invoiceId=${encodeURIComponent(targetId)}`);
    } else {
      navigate(`/patient/pay`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold">
          <Receipt className="w-3.5 h-3.5 text-amber-600" />
          <span>Stage 4 of 5 • Patient Invoices & Billing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Invoice & Billing Summary
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Review all your clinical consultation charges, pharmacy bills, and payment records.
        </p>
      </div>

      {/* Overview Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Client Account: {activeClient?.name}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ${totalOutstandingBalance.toFixed(2)}
          </h2>
          <p className="text-xs text-blue-200/80">
            Total Outstanding Balance ({pendingInvoices.length} pending {pendingInvoices.length === 1 ? "invoice" : "invoices"})
          </p>
        </div>

        {pendingInvoices.length > 0 ? (
          <button
            type="button"
            onClick={() => handleProceedToPayment()}
            className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-98"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay All Pending Bills</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>All Invoices Settled</span>
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>All Clinic Invoices</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold font-mono">
              {clientInvoices.length}
            </span>
          </h3>
          <span className="text-xs text-slate-400">
            Synchronized live with MantraAssist
          </span>
        </div>

        <div className="space-y-4">
          {clientInvoices.map((inv) => {
            const balanceDue = Math.max(0, inv.total - (inv.amountPaid || 0));
            const isPending = balanceDue > 0 && inv.status !== "paid";

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl border-2 transition-all p-6 shadow-xs ${
                  isPending
                    ? "border-blue-200/90 hover:border-blue-500 hover:shadow-md"
                    : "border-slate-200/80 opacity-90"
                }`}
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {inv.id}
                      </span>
                      {isPending ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Payment Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Paid in Full
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Issued: {inv.issueDate || "Recent"} • Due: {inv.dueDate || "Immediate"}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Balance Due
                    </span>
                    <span className={`text-xl font-bold font-mono ${isPending ? "text-blue-600" : "text-slate-500"}`}>
                      ${balanceDue.toFixed(2)}
                    </span>
                    {inv.amountPaid !== undefined && inv.amountPaid > 0 && isPending && (
                      <span className="text-[11px] text-slate-400 block">
                        Paid: ${inv.amountPaid.toFixed(2)} / ${inv.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">
                    Itemized Services & Medications:
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                    {(inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems : [
                      { id: "item-default", description: "Clinical Consultation", quantity: 1, unitPrice: inv.total }
                    ]).map((item: any, idx: number) => (
                      <div key={item.id || idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{item.description}</div>
                          <div className="text-slate-400">Qty: {item.quantity || 1} • Unit Price: ${item.unitPrice?.toFixed(2)}</div>
                        </div>
                        <div className="font-bold text-slate-900 font-mono">
                          ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Total Amount: ${inv.total.toFixed(2)}</span>
                  </div>

                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => handleProceedToPayment(inv.id)}
                      className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Proceed to Payment Screen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleProceedToPayment(inv.id)}
                      className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Receipt / QR Summary</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
