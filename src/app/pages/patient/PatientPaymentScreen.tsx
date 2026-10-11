import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  QrCode,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Receipt,
  Download,
  ArrowRight,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { invoiceService } from "../../../lib/invoiceService";
import confetti from "canvas-confetti";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientPaymentScreen() {
  const navigate = useNavigate();
  const { activeClient, onStageChange } = useOutletContext<PortalContext>();

  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);

  const invoiceId = `INV-${activeClient?.id || "CL-001"}`;
  const totalAmount = 210.6;

  const handleConfirmPayment = () => {
    if (!activeClient) return;

    // 1. Record canonical payment against invoice in invoiceService
    const result = invoiceService.recordPayment(
      invoiceId,
      totalAmount,
      "qr",
      "Demo Patient Portal QR Settlement"
    );

    // 2. Advance patient stage to "Payment Done" (Stage 5)
    const all = getStoredClients();
    const updated = all.map((c) =>
      c.id === activeClient.id
        ? { ...c, stage: "Payment Done", processes: Array.from(new Set(["Patient Care Journey", ...(c.processes || [])])) }
        : c
    );
    saveStoredClients(updated);

    // 3. Trigger confetti celebration & set success view
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    setPaymentReceipt(
      result?.payment || {
        receiptNumber: `REC-${activeClient.id?.replace(/\D/g, "") || "101"}-88`,
        amount: totalAmount,
        method: "qr",
        paymentDate: new Date().toISOString().split("T")[0],
      }
    );
    setPaymentDone(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Stage 5 of 5 • Payment Done</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Payment Settlement
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Scan QR code to settle your clinical invoice. Once confirmed, payment is recorded directly against your invoice in <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">invoiceService.ts</code>.
        </p>
      </div>

      {/* Main Payment Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        {paymentDone ? (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Payment Confirmed & Settled
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Receipt #{paymentReceipt?.receiptNumber || "REC-2026-99"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Payment of <strong>${totalAmount.toFixed(2)}</strong> successfully received for invoice {invoiceId}. Patient care journey marked as <strong>Payment Done</strong>.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Payer:</span>
                <span className="font-semibold text-slate-800">{activeClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-semibold text-slate-800">{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-700">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-slate-700 font-medium">Demo QR Code</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Paid & Reconciled
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/patient")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <span>View Complete Journey Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onStageChange("Client Checked In");
                  navigate("/patient");
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo to Step 1
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Honest Demo QR Code */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200/80">
                <svg
                  className="w-44 h-44"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="26" height="26" rx="4" fill="#059669" />
                  <rect x="14" y="14" width="18" height="18" rx="2" fill="white" />
                  <rect x="18" y="18" width="10" height="10" fill="#059669" />

                  <rect x="64" y="10" width="26" height="26" rx="4" fill="#059669" />
                  <rect x="68" y="14" width="18" height="18" rx="2" fill="white" />
                  <rect x="72" y="18" width="10" height="10" fill="#059669" />

                  <rect x="10" y="64" width="26" height="26" rx="4" fill="#059669" />
                  <rect x="14" y="68" width="18" height="18" rx="2" fill="white" />
                  <rect x="18" y="72" width="10" height="10" fill="#059669" />

                  <rect x="42" y="12" width="8" height="8" fill="#0F172A" />
                  <rect x="52" y="22" width="8" height="8" fill="#0F172A" />
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#10B981" />
                  <rect x="64" y="44" width="8" height="8" fill="#0F172A" />
                  <rect x="74" y="54" width="12" height="6" fill="#0F172A" />
                  <rect x="42" y="68" width="8" height="14" fill="#0F172A" />
                  <rect x="54" y="78" width="14" height="8" fill="#0F172A" />
                  <rect x="72" y="68" width="8" height="8" fill="#0F172A" />
                </svg>
              </div>

              {/* Honest Demo Banner Label */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Frontend Demo • No Real Gateway
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Scan simulation for Invoice {invoiceId}
                </p>
              </div>
            </div>

            {/* Right: Payment Actions */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-semibold text-slate-800">{invoiceId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-800">{activeClient?.name}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">Amount to Pay:</span>
                  <span className="text-xl font-black text-slate-900">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Payment as Done (Demo Simulation)</span>
                </button>
              </div>

              <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Records payment in invoiceService & advances stage to Payment Done</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
