import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  X,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { useInvoices } from "../../context/InvoiceContext";
import { toast } from "sonner";

interface PatientBillingProps {
  clientId: string;
  clientName: string;
}

export default function PatientBilling({ clientId, clientName }: PatientBillingProps) {
  const { invoices, updateInvoice } = useInvoices();
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");
  const [isProcessing, setIsProcessing] = useState(false);

  // Find canonical invoice INV-2026-041
  const canonicalInvoice =
    invoices.find((inv) => inv.id === "INV-2026-041") ||
    invoices.find((inv) => inv.clientName?.toLowerCase().includes("ramesh")) || {
      id: "INV-2026-041",
      clientId,
      clientName: clientName || "Ramesh Iyer",
      appointmentTitle: "Cataract Surgery Package",
      status: "sent",
      total: 650,
      balanceDue: 650,
      amountPaid: 0,
      subtotal: 1850,
      discountAmount: 1200,
      lineItems: [
        { id: "li-1", description: "Surgeon fee", quantity: 1, unitPrice: 900 },
        { id: "li-2", description: "OT & anesthesia", quantity: 1, unitPrice: 650 },
        { id: "li-3", description: "IOL lens", quantity: 1, unitPrice: 300 },
      ],
    };

  const isPaid = canonicalInvoice.status === "paid" || Number(canonicalInvoice.amountPaid) >= 650;
  const balanceDue = isPaid ? 0 : 650;

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      updateInvoice("INV-2026-041", {
        status: "paid",
        amountPaid: 650,
        paidAt: new Date().toISOString(),
      } as any);

      setIsPayModalOpen(false);
      toast.success("Payment of $650.00 confirmed. Receipt RCPT-2026-041 generated.");
    }, 600);
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header — Rule 0 & §4: Header "Billing", no subtext */}
      <div>
        <h1 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-white">
          Billing
        </h1>
      </div>

      {/* Balance is the only thing that matters visually (§4) */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Current Balance
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isPaid ? "$0.00 — All paid up" : "$650.00 owed"}
          </div>
        </div>

        {/* Action: Pay now button if balance > 0, or View receipt link if paid */}
        <div>
          {!isPaid ? (
            <button
              type="button"
              onClick={() => setIsPayModalOpen(true)}
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <span>Pay now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-[#1456f0] hover:underline"
            >
              <FileCheck className="w-4 h-4" />
              <span>View receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Flat itemized list below, minimal — line items with amount, nothing more (§4) */}
      <div className="bg-white dark:bg-[#151c24] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 flex items-center justify-between text-xs">
          <span className="text-slate-700 dark:text-slate-300">Surgeon fee</span>
          <span className="font-medium text-slate-900 dark:text-white font-mono">$900.00</span>
        </div>

        <div className="p-4 flex items-center justify-between text-xs">
          <span className="text-slate-700 dark:text-slate-300">OT &amp; anesthesia</span>
          <span className="font-medium text-slate-900 dark:text-white font-mono">$650.00</span>
        </div>

        <div className="p-4 flex items-center justify-between text-xs">
          <span className="text-slate-700 dark:text-slate-300">IOL lens</span>
          <span className="font-medium text-slate-900 dark:text-white font-mono">$300.00</span>
        </div>

        <div className="p-4 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-900/30 font-medium">
          <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
          <span className="text-slate-900 dark:text-white font-mono">$1,850.00</span>
        </div>

        <div className="p-4 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <span>Insurance adjustment</span>
          <span className="font-mono">–$1,200.00</span>
        </div>

        <div className="p-4 flex items-center justify-between text-xs font-semibold bg-slate-50 dark:bg-slate-900">
          <span className="text-slate-900 dark:text-white">Balance due</span>
          <span className="font-mono text-slate-900 dark:text-white">
            {isPaid ? "$0.00" : "$650.00"}
          </span>
        </div>
      </div>

      {/* Payment Method Modal (Flow 11) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[11px] font-semibold text-[#1456f0] uppercase tracking-wider">
                Invoice INV-2026-041
              </span>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                Pay Cataract Surgery Package
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Amount due: <strong className="text-slate-900 dark:text-white">$650.00</strong>
              </p>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select payment method
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === "card"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-[#1456f0] text-slate-900 dark:text-white ring-1 ring-[#1456f0]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-[#1456f0]" />
                      <span className="font-medium">Credit / Debit Card</span>
                    </div>
                    {paymentMethod === "card" && <CheckCircle2 className="w-4 h-4 text-[#1456f0]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === "upi"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-[#1456f0] text-slate-900 dark:text-white ring-1 ring-[#1456f0]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                        UPI
                      </span>
                      <span className="font-medium">UPI / Instant Bank Transfer</span>
                    </div>
                    {paymentMethod === "upi" && <CheckCircle2 className="w-4 h-4 text-[#1456f0]" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                Secure 256-bit encrypted checkout · Instant receipt generation
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Confirm & Pay $650.00"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal (RCPT-2026-041) */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                Official Payment Receipt
              </span>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                Receipt RCPT-2026-041
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Invoice: INV-2026-041 · EyeMantra
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Surgeon:</span>
                <span className="font-semibold text-slate-900 dark:text-white">Dr. Meera Nair</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-mono text-slate-900 dark:text-white">Sept 21, 2026</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/70 dark:border-slate-700 pt-2">
                <span className="font-semibold text-slate-900 dark:text-white">Amount Paid:</span>
                <span className="font-bold text-emerald-600 font-mono">$650.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-emerald-600">Paid &amp; Settled</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
