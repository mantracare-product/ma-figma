import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router";
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
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Client, getStoredClients, saveStoredClients } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";
import { invoiceService } from "../../../lib/invoiceService";
import { ClientInvoice } from "../../../app/types/invoiceTypes";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { toast } from "sonner";

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
  const [searchParams] = useSearchParams();
  const { activeClient, activeProcess, onStageChange } = useOutletContext<PortalContext>();

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => invoiceService.getInvoices());
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = invoiceService.subscribe(setInvoices);
    return unsub;
  }, []);

  const requestedInvoiceId = searchParams.get("invoiceId");

  // Find target invoice (in sync with AI Receptionist matching logic)
  const targetInvoice = useMemo(() => {
    if (requestedInvoiceId) {
      const found = invoices.find(
        (inv) =>
          inv.id === requestedInvoiceId ||
          inv.id.toLowerCase() === requestedInvoiceId.toLowerCase() ||
          inv.invoiceNumber === requestedInvoiceId
      );
      if (found) return found;
    }

    // Otherwise find pending invoice for active client
    if (activeClient) {
      const patientPhoneDigits = (activeClient.phone || "").replace(/\D/g, "");
      const patientNameLower = (activeClient.name || "").toLowerCase().trim();
      const clientInvs = invoices.filter(
        (inv) =>
          (inv.clientId && String(inv.clientId) === String(activeClient.id)) ||
          (inv.clientName && patientNameLower && inv.clientName.toLowerCase().trim() === patientNameLower) ||
          (patientPhoneDigits && inv.clientPhone && inv.clientPhone.replace(/\D/g, "").includes(patientPhoneDigits))
      );
      const pending = clientInvs.find((inv) => (inv.total - (inv.amountPaid || 0)) > 0 && inv.status !== "paid");
      if (pending) return pending;
      if (clientInvs.length > 0) return clientInvs[0];
    }

    // Fallback in sync with AI Receptionist: any pending invoice in the clinic system
    const anyPending = invoices.find((inv) => (inv.total - (inv.amountPaid || 0)) > 0 && inv.status !== "paid");
    if (anyPending) return anyPending;

    if (invoices.length > 0) return invoices[0];

    // Default fallback: create and persist canonical invoice in invoiceService
    const defaultInv: ClientInvoice = {
      id: `INV-CL-1001`,
      invoiceNumber: `INV-2026-101`,
      clientId: activeClient?.id || "CL-001",
      clientName: activeClient?.name || "Patient",
      clientEmail: activeClient?.email || "",
      clientPhone: activeClient?.phone || "",
      subtotal: 75.0,
      discountAmount: 0,
      taxAmount: 3.75,
      total: 78.75,
      amountPaid: 0,
      currency: "$",
      status: "sent" as const,
      createdBy: "System",
      lineItems: [
        {
          id: "li-consult",
          description: "Follow-up Consultation & Clinical Assessment",
          quantity: 1,
          unitPrice: 78.75,
          source: "service" as const,
        },
      ],
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    };
    invoiceService.saveInvoices([defaultInv]);
    return defaultInv;
  }, [invoices, requestedInvoiceId, activeClient]);

  const invoiceId = targetInvoice.id;
  const balanceDue = Math.max(0, targetInvoice.total - (targetInvoice.amountPaid || 0)) || targetInvoice.total;

  const upiPayload = `upi://pay?pa=billing@mantracare.com&pn=MantraCare+Health&am=${balanceDue.toFixed(
    2
  )}&cu=USD&tr=${invoiceId}&tn=Portal+Settlement+${invoiceId}`;

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(
      upiPayload,
      {
        width: 280,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [upiPayload]);

  const handleConfirmPayment = () => {
    if (!activeClient || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Ensure invoice exists in invoiceService
      if (!invoiceService.getInvoiceById(invoiceId)) {
        invoiceService.saveInvoices([targetInvoice, ...invoiceService.getInvoices()]);
      }

      // 2. Record canonical payment against invoice in invoiceService
      const result = invoiceService.recordPayment(
        invoiceId,
        balanceDue,
        "qr_code",
        "Client Portal Touchless QR Settlement"
      );

      // 3. Dispatch events for instant MantraAssist synchronization
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mantra_payments_changed"));
        window.dispatchEvent(new Event("mantra_invoices_changed"));
        window.dispatchEvent(new Event("storage"));
      }

      // 4. Advance patient stage to "Payment Done" (Stage 5)
      const targetProcName = activeProcess?.name || "Patient Care Journey";
      const all = getStoredClients();
      const updated = all.map((c) =>
        c.id === activeClient.id
          ? { ...c, stage: "Payment Done", processes: Array.from(new Set([targetProcName, ...(c.processes || [])])) }
          : c
      );
      saveStoredClients(updated);
      try {
        onStageChange("Payment Done");
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: activeClient.id }));
      }

      // 5. Trigger confetti celebration
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#6366f1", "#f59e0b"],
        });
      } catch {}

      setPaymentReceipt(
        result?.payment || {
          receiptNumber: `REC-${invoiceId.replace(/[^0-9]/g, "").slice(-5) || "88"}-10`,
          amount: balanceDue,
          method: "qr_code",
          paymentDate: new Date().toISOString().split("T")[0],
        }
      );
      setPaymentDone(true);
      toast.success(`Payment of $${balanceDue.toFixed(2)} recorded and synchronized with MantraAssist!`);
    } catch (err: any) {
      toast.error(err?.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(upiPayload);
    setCopied(true);
    toast.success("Payment link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Stage 5 of 5 • Payment Settlement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Payment Settlement
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Scan QR code to settle invoice <span className="font-mono font-semibold text-slate-800">{invoiceId}</span>. Payments are recorded live in MantraAssist.
        </p>
      </div>

      {/* Main Payment Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        {paymentDone ? (
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
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
                Payment of <strong>${balanceDue.toFixed(2)}</strong> successfully received for invoice <strong>{invoiceId}</strong>. Synchronized with MantraAssist.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 max-w-md mx-auto text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Payer:</span>
                <span className="font-semibold text-slate-800">{activeClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-semibold text-slate-800 font-mono">{invoiceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">${balanceDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-slate-700 font-medium">Touchless QR Code</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Paid & Reconciled
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/patient/bill")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
              >
                <span>Back to All Invoices</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/patient")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
              >
                <span>View Complete Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Dynamic QR Code */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200 relative">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for Invoice ${invoiceId}`}
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-50 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Scan to Pay via UPI / Bank App</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports Google Pay, PhonePe, Paytm & Mobile Banking
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied UPI Link" : "Copy UPI Link"}</span>
              </button>
            </div>

            {/* Right: Summary & Action */}
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Settlement Details
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Invoice {invoiceId}
                </h3>
                <p className="text-xs text-slate-500">
                  Payment for clinical consultation charges and healthcare services.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Patient:</span>
                  <span className="font-semibold text-slate-800">{activeClient?.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Total:</span>
                  <span className="font-semibold text-slate-800">${targetInvoice.total?.toFixed(2)}</span>
                </div>
                {targetInvoice.amountPaid !== undefined && targetInvoice.amountPaid > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-emerald-600">${targetInvoice.amountPaid.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Amount to Settle:</span>
                  <span className="text-emerald-700 font-mono text-base">${balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Settlement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Record Payment (${balanceDue.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settles invoice directly in MantraAssist</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
