import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Client } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../../app/types/invoiceTypes";

interface PortalContext {
  activeClient: Client;
  activeProcess?: Process;
  currentStageName?: string;
  currentStageIndex?: number;
  stages?: Stage[];
  onStageChange?: (newStageName: string) => void;
}

export default function PatientBillScreen() {
  const navigate = useNavigate();
  const { activeClient } = useOutletContext<PortalContext>();

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => invoiceService.getInvoices());

  useEffect(() => {
    const unsub = invoiceService.subscribe(setInvoices);
    return unsub;
  }, []);

  // Find all invoices matching activeClient
  const clientInvoices = useMemo(() => {
    if (!activeClient) return [];
    const patientPhoneDigits = (activeClient.phone || "").replace(/\D/g, "");
    const patientNameLower = (activeClient.name || "").toLowerCase().trim();

    const matched = invoices.filter((inv) => {
      if (inv.clientId && String(inv.clientId) === String(activeClient.id)) return true;
      if (inv.clientName && patientNameLower && inv.clientName.toLowerCase().trim() === patientNameLower) return true;
      const invPhoneDigits = (inv.clientPhone || "").replace(/\D/g, "");
      if (
        patientPhoneDigits &&
        invPhoneDigits &&
        (patientPhoneDigits === invPhoneDigits || patientPhoneDigits.slice(-10) === invPhoneDigits.slice(-10))
      ) {
        return true;
      }
      return false;
    });

    if (matched.length > 0) return matched;

    const pendingInSystem = invoices.filter(
      (inv) => inv.total - (inv.amountPaid || 0) > 0 && inv.status !== "paid"
    );
    if (pendingInSystem.length > 0) return pendingInSystem;

    if (invoices.length > 0) return invoices;

    // Seed canonical invoice in invoiceService if empty
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
    (inv) => inv.total - (inv.amountPaid || 0) > 0 && inv.status !== "paid"
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
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header (Clean, Zero Subtext) ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing</h1>
      </div>

      {/* ── Hero Balance Card (Single Visual Priority) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Outstanding Balance
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-mono">
            {totalOutstandingBalance > 0
              ? `$${totalOutstandingBalance.toFixed(2)}`
              : "$0.00"}
          </div>
          <span className="text-xs font-semibold text-slate-500 block">
            {totalOutstandingBalance > 0
              ? `${pendingInvoices.length} pending invoice${pendingInvoices.length > 1 ? "s" : ""}`
              : "All paid up — no balance due"}
          </span>
        </div>

        {totalOutstandingBalance > 0 ? (
          <button
            type="button"
            onClick={() => handleProceedToPayment()}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Now (${totalOutstandingBalance.toFixed(2)})</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 self-start sm:self-center">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Account in Good Standing</span>
          </div>
        )}
      </div>

      {/* ── Itemized Invoices List ── */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Statements &amp; Invoices
        </div>

        <div className="space-y-3">
          {clientInvoices.map((inv) => {
            const isPaid = inv.status === "paid" || inv.total - (inv.amountPaid || 0) <= 0;
            const balance = Math.max(0, inv.total - (inv.amountPaid || 0));

            return (
              <div
                key={inv.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-400">
                        #{inv.invoiceNumber || inv.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {inv.lineItems?.[0]?.description || inv.appointmentTitle || "Clinical Consultation Fee"}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-slate-900 block">
                      ${inv.total.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Settled in full
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        Due: ${balance.toFixed(2)}
                      </span>
                    )}
                  </span>

                  <div>
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleProceedToPayment(inv.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Receipt
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleProceedToPayment(inv.id)}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Pay ${balance.toFixed(2)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
